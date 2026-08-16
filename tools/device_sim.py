#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SerialCube 模拟从机 (device simulator) — 替代真实设备, 无硬件联调协议与主机逻辑.

- schema 驱动: 收 MB/REQ 请求 → 按 CB/RESP 布局应答 (状态模型取值),
  协议变更只改 schema + 少量 handler。
- 状态模型: 按 CB 布局字段初始化 (schema 默认值), 支持注入/漂移/故障注入。
- 传输层可插拔: 真实串口 (pyserial) / socket 回环。

用法:
  python tools/device_sim.py --schema tools/schemas/bms_v113.json --port COM20
  python tools/device_sim.py --schema tools/schemas/bms_v113.json --selftest   # 无串口自测
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

from schema_codec import _pick_layout, build_response, parse_frame

ROOT = Path(__file__).resolve().parent.parent


class SimDevice:
    """通用 schema 驱动模拟从机: 请求 → 应答, 状态模型 + 故障注入."""

    def __init__(self, schema: dict):
        self.schema = schema
        self.state: dict = {}
        self._init_state()
        self.mute_until = 0.0          # >now 时丢弃所有请求 (通信超时模拟)
        self.crc_bad_once = False      # 下次应答强制 CRC 错
        self.log: list[str] = []

    def _init_state(self) -> None:
        # 从 CB/RESP 布局的 default 初始化状态; 无 default 的字段给 0
        for k, cmd_def in self.schema.get("commands", {}).items():
            for dir_ in ("CB", "RESP", "default"):
                layout = cmd_def.get(dir_)
                if not layout or not layout.get("fields"):
                    continue
                for f in layout["fields"]:
                    if f.get("todo") or f["name"] in self.state:
                        continue
                    if f.get("type") == "array":
                        item = f.get("item", {})
                        d = f.get("default")
                        self.state[f["name"]] = list(d) if isinstance(d, list) else [0] * item.get("count", 0)
                    elif f.get("type") == "ascii":
                        self.state[f["name"]] = f.get("default", "")
                    elif "default" in f:
                        self.state[f["name"]] = f["default"]
                    else:
                        self.state[f["name"]] = 0

    def respond(self, request: bytes) -> bytes | None:
        """收到请求帧 → 应答帧 (None = 不应答)."""
        parsed = parse_frame(self.schema, request)
        if not parsed.get("ok") or parsed.get("error"):
            self.log.append(f"忽略: {parsed.get('error', 'bad frame')}")
            return None
        cmd = parsed["cmd"]
        req_dir = parsed.get("dir") or "MB"
        # 应答方向: 请求 MB → 应答 CB; 请求 REQ → 应答 RESP
        resp_dir = {"MB": "CB", "REQ": "RESP"}.get(req_dir)
        cmd_def = self.schema["commands"].get(f"{cmd:02X}") or self.schema["commands"].get(f"0x{cmd:02X}")
        if not cmd_def or (resp_dir not in cmd_def and "default" not in cmd_def):
            self.log.append(f"0x{cmd:02X}: 无应答布局, 静默")
            return None
        if time.time() < self.mute_until:
            self.log.append(f"0x{cmd:02X}: mute 中, 丢弃")
            return None
        # 应答状态 = 当前 state (可用 cmd hook 定制)
        resp = build_response(self.schema, cmd, resp_dir or "default", self.state)
        if self.crc_bad_once:
            resp = resp[:-2] + bytes([resp[-2] ^ 0xFF, resp[-1]]) if len(resp) >= 3 else resp
            self.crc_bad_once = False
        self.log.append(f"0x{cmd:02X}: 应答 {resp.hex(' ')}")
        return resp

    def tick(self) -> None:
        """漂移 daemon: 状态缓慢变化 (遥测曲线真实感)."""
        for name in ("RSOC", "soc", "ASOC"):
            if name in self.state:
                v = self._num(self.state[name]) + random.uniform(-0.3, 0.3)
                self.state[name] = max(0, min(100, round(v, 1)))
        for name in ("SysCurr", "pack_i", "Current"):
            if name in self.state:
                self.state[name] = round(self._num(self.state[name]) + random.uniform(-0.5, 0.5), 1)

    @staticmethod
    def _num(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0.0


def main() -> int:
    ap = argparse.ArgumentParser(description="SerialCube 模拟从机 (schema 驱动)")
    ap.add_argument("--schema", required=True, help="tools/schemas/<proto>.json")
    ap.add_argument("--port", default=None, help="串口 (如 COM20); 缺省 selftest")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--selftest", action="store_true", help="无串口自测 (循环请求→应答→解析)")
    args = ap.parse_args()

    schema = json.loads(Path(args.schema).read_text(encoding="utf-8"))
    dev = SimDevice(schema)
    print(f"[device_sim] 协议: {schema['meta']['name']} (id={schema['id']})")

    if args.selftest or not args.port:
        return _selftest(schema, dev)

    import serial  # 延迟导入
    ser = serial.Serial(args.port, args.baud, timeout=0.2)
    print(f"[device_sim] 监听: {args.port}@{args.baud}")
    try:
        while True:
            req = ser.read(4096)
            if req:
                resp = dev.respond(req)
                if resp:
                    ser.write(resp)
                dev.tick()
    except KeyboardInterrupt:
        pass
    finally:
        ser.close()
    return 0


def _selftest(schema: dict, dev: SimDevice) -> int:
    """循环: 主机发请求 → 从机应答 → 解析应答, 断言往返一致."""
    from schema_codec import build_query

    ok = True
    for k, cmd_def in schema["commands"].items():
        if not any(d in cmd_def for d in ("MB", "REQ")):
            continue
        cmd = int(k, 16)
        try:
            req = build_query(schema, cmd)
        except KeyError as e:
            print(f"  [skip] 0x{cmd:02X}: {e}")
            continue
        resp = dev.respond(req)
        if resp is None:
            print(f"  [skip] 0x{cmd:02X}: 无应答布局")
            continue
        parsed = parse_frame(schema, resp)
        if not parsed.get("ok"):
            print(f"  [FAIL] 0x{cmd:02X}: 应答解析失败 {parsed.get('errors')}")
            ok = False
            continue
        if parsed.get("crcOk") is not True:
            print(f"  [FAIL] 0x{cmd:02X}: 应答 CRC 不过")
            ok = False
            continue
        vals = parsed.get("values", {})
        print(f"  [PASS] 0x{cmd:02X}: 应答 {resp.hex(' ')} values={len(vals)}")
    # 故障注入自测
    dev.mute_until = time.time() + 10
    muted = dev.respond(b"\x5a\x01\x01\x02\x00\x00\x91\x1d")
    dev.mute_until = 0
    if muted is not None:
        print("  [FAIL] mute 注入未生效")
        ok = False
    else:
        print("  [PASS] mute 注入 (通信超时模拟)")
    dev.crc_bad_once = True
    bad = dev.respond(b"\x5a\x01\x01\x02\x00\x00\x91\x1d")
    if bad is None or parse_frame(schema, bad).get("crcOk") is not False:
        print("  [FAIL] crc-bad 注入未生效")
        ok = False
    else:
        print("  [PASS] crc-bad 注入")
    print("[device_sim] selftest: " + ("通过" if ok else "失败"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

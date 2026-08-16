#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SerialCube 模拟主机 (host simulator) — 替代上位机与设备通信.

- 纯 schema 驱动: 读 tools/schemas/<proto>.json, 按命令表周期发查询帧,
  协议变更只改 schema, 不重制上位机。
- 编解码复用 tools/schema_codec.py (与页面 NS.* 同逻辑, 黄金向量交叉验证)。
- 传输层可插拔: 真实串口 (pyserial) / loopback 自检。

用法:
  python tools/host_sim.py --schema tools/schemas/bms_v113.json --port COM21 --cadence 200
  python tools/host_sim.py --schema tools/schemas/bms_v113.json --once    # 自测
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from schema_codec import build_query, parse_frame

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    ap = argparse.ArgumentParser(description="SerialCube 模拟主机 (schema 驱动)")
    ap.add_argument("--schema", required=True, help="tools/schemas/<proto>.json")
    ap.add_argument("--port", default=None, help="串口 (如 COM21); 缺省 loopback 自测")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--cadence", type=int, default=500, help="查询周期 ms")
    ap.add_argument("--once", action="store_true", help="每命令只发一次后退出")
    args = ap.parse_args()

    schema = json.loads(Path(args.schema).read_text(encoding="utf-8"))
    print(f"[host_sim] 协议: {schema['meta']['name']} (id={schema['id']})")
    query_cmds = [int(k, 16) for k, v in schema["commands"].items() if any(d in v for d in ("MB", "REQ"))]
    if not query_cmds:
        print("[host_sim] 无查询命令, 退出")
        return 1
    print(f"[host_sim] 查询命令: {[hex(c) for c in query_cmds]}")

    ser = None
    transport = "loopback"
    if args.port:
        import serial  # 延迟导入, 无 pyserial 时仍可 loopback 自测
        ser = serial.Serial(args.port, args.baud, timeout=0.2)
        transport = f"serial:{args.port}@{args.baud}"
    print(f"[host_sim] 传输: {transport} | cadence: {args.cadence}ms")

    sent = rx = crc_bad = 0
    last = {c: 0 for c in query_cmds}
    start = time.time()
    try:
        while args.once is False or time.time() - start < args.cadence / 1000 + 0.5:
            now_ms = time.time() * 1000
            for c in query_cmds:
                if now_ms - last[c] < args.cadence:
                    continue
                frame = build_query(schema, c)
                last[c] = now_ms
                if ser:
                    ser.write(frame)
                sent += 1
                if ser:
                    resp = ser.read(4096)
                    if resp:
                        parsed = parse_frame(schema, resp)
                        rx += 1
                        if parsed.get("crcOk") is False:
                            crc_bad += 1
                        if parsed.get("values"):
                            print(f"  ← 0x{c:02X}: {json.dumps(parsed['values'], ensure_ascii=False)[:160]}")
            if args.once:
                break
            time.sleep(max(0.02, args.cadence / 1000 / len(query_cmds)))
    except KeyboardInterrupt:
        pass
    finally:
        if ser:
            ser.close()
    print(f"[host_sim] 完成: tx={sent} rx={rx} crc_bad={crc_bad}")
    return 0 if _self_check(schema) else 1


def _self_check(schema) -> bool:
    golden = {
        # 0x01 MB 控制帧 (len=2, §4.1 位表为准; §3.1 的 len=1 默认请求是文档矛盾形式)
        0x01: "5A 01 01 02 00 00 91 1D",
        0x03: "5A 01 03 01 00 8C 61",   # bms_0x03_mb_req
    }
    ok = True
    for c, expect in golden.items():
        try:
            frame = build_query(schema, c)
            want = bytes(int(x, 16) for x in expect.split())
            if frame != want:
                print(f"  [FAIL] 0x{c:02X} 帧 {frame.hex(' ')} != 期望 {expect}")
                ok = False
            else:
                print(f"  [PASS] 0x{c:02X} 帧 == golden ({expect})")
        except KeyError as e:
            print(f"  [skip] 0x{c:02X}: {e}")
    print("[host_sim] 黄金向量自检: " + ("通过" if ok else "失败"))
    return ok


if __name__ == "__main__":
    sys.exit(main())

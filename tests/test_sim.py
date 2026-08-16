#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""L2 模拟器层测试 (Python) — 与 JS 侧 L1 共享同一份 golden-vectors 交叉验证.

运行:
  python tests/test_sim.py          # 无 pytest 依赖, 直接执行
  pytest tests/test_sim.py          # 有 pytest 时
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

from crc16 import crc16_modbus, checksum  # noqa: E402
from schema_codec import build_query, parse_frame, build_response  # noqa: E402
from device_sim import SimDevice  # noqa: E402


def _golden() -> dict:
    return json.loads((ROOT / "tests" / "golden-vectors.json").read_text(encoding="utf-8"))


def _schema() -> dict:
    return json.loads((ROOT / "tools" / "schemas" / "bms_v113.json").read_text(encoding="utf-8"))


def test_crc16_golden():
    for v in _golden()["crc16Modbus"]:
        data = bytes(int(x, 16) for x in v["inputHex"].split())
        got = crc16_modbus(data)
        assert got == v["crc"], f"{v['note']}: 期望 0x{v['crc']:X} 实得 0x{got:X}"


def test_checksum():
    assert checksum(bytes([0x01, 0x02, 0x03])) == 6
    assert checksum(bytes([0xFF, 0xFF])) == 0xFE


def test_parse_frame_golden():
    schema = _schema()
    for f in _golden()["frames"]:
        if f.get("proto") != "proto_bms_v113":
            continue
        frame = bytes(int(x, 16) for x in f["bytesHex"].split())
        parsed = parse_frame(schema, frame)
        assert parsed["ok"], f"{f['id']} 解析失败"
        assert parsed["cmd"] == int(f["cmd"], 16), f"{f['id']} cmd"
        assert parsed.get("dir") == f["dir"], f"{f['id']} 方向"
        assert parsed.get("crcOk") is True, f"{f['id']} CRC"
        for k, exp in f["expect"].items():
            got = parsed["values"].get(k)
            if isinstance(exp, list):
                assert got[:len(exp)] == exp, f"{f['id']} {k}: {got} != {exp}"
            else:
                assert got == exp, f"{f['id']} {k}: 期望 {exp} 实得 {got}"


def test_build_query_golden():
    schema = _schema()
    assert build_query(schema, 0x01).hex(" ").upper() == "5A 01 01 02 00 00 91 1D"
    assert build_query(schema, 0x03).hex(" ").upper() == "5A 01 03 01 00 8C 61"


def test_device_responds_all_commands():
    schema = _schema()
    dev = SimDevice(schema)
    for k in schema["commands"]:
        cmd = int(k, 16)
        if not any(d in schema["commands"][k] for d in ("MB", "REQ")):
            continue
        req = build_query(schema, cmd)
        resp = dev.respond(req)
        if resp is None:
            continue  # 无应答布局
        parsed = parse_frame(schema, resp)
        assert parsed["ok"], f"0x{cmd:02X} 应答解析失败"
        assert parsed.get("crcOk") is True, f"0x{cmd:02X} 应答 CRC 不过"


def test_ack_frame_matches_doc():
    """0x02 ack (state=0 → fail) 应答与文档示例 55 01 02 01 00 89 A0 一致."""
    schema = _schema()
    dev = SimDevice(schema)
    dev.state["ack"] = 0
    resp = dev.respond(build_query(schema, 0x02))
    assert resp is not None
    assert resp.hex(" ").upper() == "55 01 02 01 00 89 A0"


def test_fault_injection():
    schema = _schema()
    dev = SimDevice(schema)
    req = build_query(schema, 0x01)
    dev.mute_until = time.time() + 10
    assert dev.respond(req) is None, "mute 注入未生效"
    dev.mute_until = 0
    dev.crc_bad_once = True
    bad = dev.respond(req)
    assert bad is not None and parse_frame(schema, bad).get("crcOk") is not True, "crc-bad 注入未生效"


def _run_all() -> int:
    import traceback
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"  [PASS] {fn.__name__}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  [FAIL] {fn.__name__}: {e}")
            traceback.print_exc(limit=2)
    print(f"L2 sim 测试: {len(fns) - failed}/{len(fns)} 通过")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(_run_all())

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""schema_codec — schema 驱动位级编解码 (Python 侧共享实现).

与 SerialCube.html 的 NS._bitReader/_bitWriter/_schemaFrameSlice/_parseSchemaLayout/
_buildFrameSchema 逻辑一致; 被 host_sim.py / device_sim.py / pytest 复用。
黄金向量: tools/schemas/ 对应 tests/golden-vectors.json (JS/Python 交叉验证)。
"""
from __future__ import annotations

from crc16 import crc16_modbus, checksum, crc_bytes_le

U8_SIZE = {"u8": 1, "i8": 1, "u16": 2, "i16": 2, "u32": 4, "i32": 4, "float": 4, "double": 8}


def crc_size_of(crc_type: str) -> int:
    if crc_type in ("checksum", "crc8", "xor"):
        return 1
    if "16" in crc_type:
        return 2
    return 1


def bit_reader(data: bytes, start_bit: int, bit_len: int, signed: bool = False) -> int:
    """LSB-first 位寻址读取 (bit0 = 首字节最低位, 跨字节连续编号)."""
    v = 0
    for i in range(bit_len):
        pos = start_bit + i
        byte_idx = pos >> 3
        if byte_idx >= len(data):
            break
        v += ((data[byte_idx] >> (pos & 7)) & 1) * (2 ** i)
    if signed and v >= 2 ** (bit_len - 1):
        v -= 2 ** bit_len
    elif bit_len == 32 and not signed:
        v &= 0xFFFFFFFF
    return v


def bit_writer(data: bytearray, start_bit: int, bit_len: int, value: int) -> None:
    u = int(value)
    if u < 0:
        u += 2 ** bit_len
    for i in range(bit_len):
        if not (u >> i) & 1:
            continue
        pos = start_bit + i
        byte_idx = pos >> 3
        if byte_idx >= len(data):
            break
        data[byte_idx] |= 1 << (pos & 7)


def _to_num(v):
    if isinstance(v, str):
        return int(v, 16) if v.lower().startswith("0x") else int(v)
    return v


def _phys(raw, f) -> float:
    v = raw
    if f.get("scale") is not None and f.get("scale") != 1:
        v = v * f["scale"]
    if f.get("offset"):
        v = v + f["offset"]
    return v


def _is_crc(f) -> bool:
    return f.get("type") in ("crc16", "crc", "checksum")


def _is_head(f) -> bool:
    return f.get("head") is True or f.get("name") == "head"


def _head_size(schema: dict) -> int:
    return sum(U8_SIZE.get(f.get("type"), 1) for f in schema["frame"]["fields"] if _is_head(f))


def _cmd_def(schema: dict, cmd_id: int):
    key = f"{cmd_id:02X}"
    for k, v in schema["commands"].items():
        if k.lower().replace("0x", "").rjust(2, "0").upper() == key:
            return v
    return None


def _pick_layout(cmd_def: dict, dir_: str | None = None, data_len: int | None = None):
    if dir_ and cmd_def.get(dir_) and cmd_def[dir_].get("fields"):
        return dir_, cmd_def[dir_]
    cands = [v for v in cmd_def.values() if isinstance(v, dict) and v.get("fields")]
    # 方向无 match (EMS 等): 按实际数据长度匹配 layout (REQ len 0 / RESP len N)
    if data_len is not None:
        for v in cands:
            if v.get("len") == data_len:
                return None, v
    if cmd_def.get("default") and cmd_def["default"].get("fields"):
        return "default", cmd_def["default"]
    return (None, cands[0]) if cands else (None, None)


def _crc_ok(frame: bytes, crc_conf: dict, crc_size: int, head_size: int) -> bool:
    crc_type = crc_conf.get("type", "crc16-modbus")
    crc_in = frame[:len(frame) - crc_size]
    if crc_conf.get("range") in ("no_header", "no_header_tail"):
        crc_in = crc_in[head_size:]
    if crc_type == "checksum":
        return checksum(crc_in) == frame[-1]
    return frame[len(frame) - crc_size:] == crc_bytes_le(crc16_modbus(crc_in), crc_size)


def parse_frame(schema: dict, frame: bytes) -> dict:
    """帧级解析 + 校验 → { ok, cmd, dir, values, crcOk, errors }.

    与页面 NS.parseFrame 同策略: 先按 len 字段切, CRC 不过再按实际边界切。
    crcOk 按"切分后校验字段位置"判定 (与 JS 一致), 因此 len 与数据长度不符时能正确回退。
    """
    fields = schema["frame"]["fields"]
    crc_conf = schema["frame"].get("crc", {})
    crc_type = crc_conf.get("type", "crc16-modbus")
    crc_size = crc_size_of(crc_type)
    head_size = _head_size(schema)
    crc_field = next((f for f in fields if _is_crc(f)), None)

    def slice_mode(mode: str):
        parts, off, len_val = {}, 0, 0
        for f in fields:
            if _is_crc(f):
                size = crc_size
            elif f.get("type") == "data":
                size = len_val if (mode == "len" and len_val > 0) else max(0, len(frame) - off - crc_size)
            else:
                size = U8_SIZE.get(f.get("type"), 1)
            if off + size > len(frame):
                return None, f"截断@{f.get('name', '?')}", False
            parts[f["name"]] = frame[off:off + size]
            if f.get("semantic") == "dataLength":
                len_val = parts[f["name"]][0]
            off += size
        # 校验: 输入 = 帧内除校验字段外全部字节; no_header 再剔除帧头
        crc_in = frame[:len(frame) - crc_size]
        if crc_conf.get("range") in ("no_header", "no_header_tail"):
            crc_in = crc_in[head_size:]
        crc_part = parts.get(crc_field["name"], b"") if crc_field else b""
        if crc_type == "checksum":
            crc_ok = len(crc_part) == 1 and checksum(crc_in) == crc_part[0]
        else:
            crc_ok = crc_part == crc_bytes_le(crc16_modbus(crc_in), crc_size)
        return parts, None, crc_ok

    parts, err, crc_ok = slice_mode("len")
    if parts is None:
        return {"ok": False, "errors": [err]}
    if not crc_ok:
        alt, _, alt_ok = slice_mode("actual")
        if alt is not None and alt_ok:
            parts, crc_ok = alt, alt_ok

    cmd = parts["cmd"][0]
    cmd_def = _cmd_def(schema, cmd)
    if cmd_def is None:
        return {"ok": True, "cmd": cmd, "values": {}, "crcOk": crc_ok, "error": "UNKNOWN_CMD"}
    dir_ = None
    hf = next((f for f in fields if _is_head(f)), None)
    if hf and hf.get("match"):
        for d, hv in hf["match"].items():
            if parts["head"][0] == int(hv, 16):
                dir_ = d
    _, layout = _pick_layout(cmd_def, dir_, len(parts.get("data", b"")))
    values = parse_layout(layout, parts.get("data", b"")) if layout else {}
    return {"ok": True, "cmd": cmd, "dir": dir_, "crcOk": crc_ok, "values": values}


def parse_layout(layout: dict, data: bytes) -> dict:
    values = {}
    if not layout:
        return values
    for f in layout.get("fields", []):
        name, bl = f["name"], f.get("bitLen", 0)
        sb = f.get("startBit", 0)
        if f.get("todo") or f.get("type") == "bytes":
            values[name] = {"todo": f["todo"]} if f.get("todo") else list(data)
            continue
        if f.get("type") == "array":
            item = f.get("item", {})
            count, ib = item.get("count", 0), item.get("bitLen", 8)
            values[name] = [
                _phys(bit_reader(data, sb + k * ib, ib, (item.get("type", "") or "").startswith("i")), f)
                for k in range(count)
            ]
            continue
        if f.get("type") == "ascii":
            n = f.get("bitLen", 0) // 8
            base = sb // 8
            chars = [chr(data[base + k]) for k in range(n)]
            if f.get("endian") == "LE":
                chars.reverse()
            values[name] = "".join(chars).rstrip("\x00")
            continue
        raw = bit_reader(data, sb, bl, (f.get("type", "") or "").startswith("i"))
        values[name] = _phys(raw, f)
        if f.get("type") == "bitset":
            for b in f.get("bits", []):
                values[f"{name}.{b['name']}"] = (raw >> b["bit"]) & 1
        if f.get("enum") and str(raw) in f["enum"]:
            values[f"{name}_label"] = f["enum"][str(raw)]
    return values


def build_query(schema: dict, cmd_id: int, state: dict | None = None, dir_: str | None = None) -> bytes:
    """按 schema 编码一条请求帧 (与页面 _buildFrameSchema 逻辑一致)."""
    state = state or {}
    fields = schema["frame"]["fields"]
    crc_conf = schema["frame"].get("crc", {})
    crc_size = crc_size_of(crc_conf.get("type", "crc16-modbus"))
    cmd_def = _cmd_def(schema, cmd_id)
    if cmd_def is None:
        raise KeyError(f"未知命令 0x{cmd_id:02X}")
    dir_ = dir_ or ("MB" if "MB" in cmd_def else ("REQ" if "REQ" in cmd_def else next(iter(cmd_def))))
    layout = cmd_def.get(dir_)
    if not layout or not layout.get("fields"):
        raise KeyError(f"命令 0x{cmd_id:02X} 无 {dir_} 布局")
    data = bytearray(layout.get("len", 0))
    for f in layout.get("fields", []):
        if f.get("todo") or f.get("type") == "bytes":
            continue
        sb, bl = f.get("startBit", 0), f.get("bitLen", 0)
        if f.get("type") == "array":
            item, count, ib = f.get("item", {}), f.get("item", {}).get("count", 0), f.get("item", {}).get("bitLen", 8)
            src = state.get(f["name"], f.get("default", [])) or []
            for k in range(count):
                bit_writer(data, sb + k * ib, ib, round(_to_num(src[k] if k < len(src) else 0) / (f.get("scale") or 1)))
            continue
        if f.get("type") == "ascii":
            s = state.get(f["name"], f.get("default", "")) or ""
            n = bl // 8
            chars = list(s) if f.get("endian") != "LE" else list(s)[::-1]
            for k in range(n):
                data[sb // 8 + k] = ord(chars[k]) if k < len(chars) else 0
            continue
        if f.get("type") == "bitset":
            raw = _to_num(state.get(f["name"], f.get("default", 0)) or 0)
            for b in f.get("bits", []):
                bv = state.get(f"{f['name']}.{b['name']}")
                if bv is not None:
                    raw = raw | (1 << b["bit"]) if bv else raw & ~(1 << b["bit"])
            bit_writer(data, sb, bl, raw)
            continue
        phys = _to_num(state.get(f["name"], f.get("default", 0)) or 0)
        bit_writer(data, sb, bl, round(phys / (f.get("scale") or 1)))

    sections = {}
    for f in fields:
        if f["name"] == "head":
            hv = (f.get("match") or {}).get(dir_) or f.get("default", "0x00")
            n = int(hv, 16)
            sections["head"] = bytes([(n >> 8) & 0xFF, n & 0xFF]) if f.get("type") == "u16" else bytes([n & 0xFF])
        elif f["name"] == "addr":
            sections["addr"] = bytes([_to_num(state.get("addr", 1)) & 0xFF])
        elif f["name"] == "cmd":
            sections["cmd"] = bytes([cmd_id & 0xFF])
        elif f["name"] == "len":
            sections["len"] = bytes([len(data) & 0xFF])
        elif f["name"] == "data":
            sections["data"] = bytes(data)
        elif _is_crc(f):
            sections[f["name"]] = bytes(crc_size)
    merged = b"".join(sections[f["name"]] for f in fields)
    crc_in = merged[:len(merged) - crc_size]
    if crc_conf.get("range") in ("no_header", "no_header_tail"):
        crc_in = crc_in[_head_size(schema):]
    crc_type = crc_conf.get("type", "crc16-modbus")
    tail = bytes([checksum(crc_in)]) if crc_type == "checksum" else crc_bytes_le(crc16_modbus(crc_in), crc_size)
    return merged[:len(merged) - crc_size] + tail


def build_response(schema: dict, cmd_id: int, dir_: str, state: dict) -> bytes:
    """按 CB/RESP 布局编码响应帧 (模拟从机用; 帧头/方向按 dir_)."""
    cmd_def = _cmd_def(schema, cmd_id)
    if cmd_def is None:
        raise KeyError(f"未知命令 0x{cmd_id:02X}")
    layout = cmd_def.get(dir_)
    if not layout or not layout.get("fields"):
        raise KeyError(f"命令 0x{cmd_id:02X} 无 {dir_} 布局")
    return build_query(schema, cmd_id, state, dir_=dir_)

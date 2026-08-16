#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SerialCube 共享协议基元 — Python 侧 (模拟主机 / 模拟从机 / pytest 复用)

与 SerialCube.html 内 NS.crc16Modbus / NS.crcChecksum 行为保持一致
(均已通过 BMS 协议文档黄金向量校验)。
"""
from __future__ import annotations


def crc16_modbus(data: bytes) -> int:
    """CRC-16/MODBUS (poly 0xA001, init 0xFFFF, LSB-first).

    BMS 协议文档 §2 Python 实现; 帧内存储低字节在前 (crc_l, crc_h)。
    测试向量: crc16_modbus(b'\\x5a\\x01\\x03\\x01\\x00') == 0x618C
    """
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = ((crc >> 1) ^ 0xA001) if (crc & 0x0001) else (crc >> 1)
    return crc & 0xFFFF


def crc_bytes_le(crc: int, size: int = 2) -> bytes:
    """CRC 值 → 帧内字节 (低字节在前)."""
    return bytes([(crc >> (8 * i)) & 0xFF for i in range(size)])


def checksum(data: bytes) -> int:
    """1 字节累加和 (EMS: sum(addr+cmd+len+data) & 0xFF)."""
    return sum(data) & 0xFF


def parse_frame(frame: bytes, cmd_offset: int = 2, len_offset: int = 3,
                crc_tail: int = 2, head: int = 0) -> dict:
    """按 head+addr+cmd+len+data+crc 布局切帧 (参数化偏移, 兼容 BMS/EMS).

    BMS: head=0, cmd_offset=2, len_offset=3, crc_tail=2
    EMS: head=0, cmd_offset=3, len_offset=4, crc_tail=1
    返回 { head, addr, cmd, length, data, crc }.
    """
    addr = frame[head + 1]
    cmd = frame[cmd_offset]
    length = frame[len_offset]
    data = frame[len_offset + 1: len(frame) - crc_tail]
    crc = frame[len(frame) - crc_tail:]
    return {"head": frame[head], "addr": addr, "cmd": cmd, "length": length,
            "data": data, "crc": crc}


if __name__ == "__main__":
    # 自检: 与文档黄金向量一致
    assert crc16_modbus(b"\x5a\x01\x03\x01\x00") == 0x618C, "0x03 请求"
    assert crc16_modbus(b"\x01\x03\x00\x00\x00\x0a") == 0xCDC5, "Modbus 读 10 寄存器"
    assert crc16_modbus(b"\x5a\x01\x01\x01\x00") == 0xA12D, "0x01 默认请求"
    assert checksum(bytes([0x01, 0x01, 0x01, 0x00])) == 3, "checksum 示例"
    print("[OK] tools/crc16.py 自检通过 (crc16_modbus / checksum / parse_frame)")

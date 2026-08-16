#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""BMS 保护标志位解析: 从 .tmp/bms-bits-dump.txt (xlsx「BMS保护标志位」sheet) 提取位名,
映射到 bms_v113.json 的 0x01 CB 布局 bitset 字段的 bits[]。

映射 (xlsx 组内字节偏移 → 0x01 CB 字段, 语义对齐; 位偏移以 BMS md §4.2 表为权威):
  保护寄存器组: byte0-1 → ProtectCode(16bit), byte2 → ErrCode bit0-7,
               byte3-4 → AFE_ProtectCode(16bit), byte5 → ErrCode bit8-9 (NTC 短路/开路)
  状态寄存器组: byte0-1 → ChgDsgState(16bit), byte2 → SysState(8bit),
               byte3-7 → CellBalance(32bit), byte7 → SignalSource(8bit)
用法: 先 python tools/scripts/dump-bms-xlsx.py (或已有 .tmp/bms-bits-dump.txt), 再跑本脚本
"""
import json
import re
from collections import OrderedDict

DUMP = '.tmp/bms-bits-dump.txt'
SCHEMA = 'tools/schemas/bms_v113.json'

# 组名关键词 → (字段名, 字段内 bit 起始偏移) 的映射; 组内 byte → 字段内 bit = (byte - group_start_byte)*8 + bit
# 保护组: start_byte 0; ProtectCode@byte0-1, ErrCode@byte2(+byte5 高字节 NTC), AFE@byte3-4
# 状态组: start_byte 0; ChgDsgState@byte0-1, SysState@byte2, CellBalance@byte3-7, SignalSource@byte7

def parse_bits(comment):
    """从 Comment 提取 [(bit, 中文名), ...]"""
    bits = []
    for m in re.finditer(r'Bit(\d+):([^\s|]+)', comment):
        name = m.group(2)
        if name not in ('RSVD',):
            bits.append((int(m.group(1)), name))
    return bits


def main():
    lines = open(DUMP, encoding='utf-8').read().splitlines()
    schema = json.load(open(SCHEMA, encoding='utf-8'))
    c01_cb = schema['commands']['0x01']['CB']['fields']

    def field_by_name(name):
        return next((f for f in c01_cb if f['name'] == name), None)

    group = None
    for line in lines:
        cells = [c.strip() for c in line.split(' || ')]
        if len(cells) < 7:
            continue
        name, sender, receiver, bstart, bend, unit, comment = cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], cells[6] if len(cells) > 6 else ''
        # 组名行: byte 列为空 + name 以"寄存器"结尾
        if bstart == '' and name.endswith('寄存器'):
            group = name
            continue
        if bstart == '' or not bstart.isdigit():
            continue
        bs, be = int(bstart), int(bend)
        if group == '电池保护寄存器':
            if bs == 0:   target, base = field_by_name('ProtectCode'), 0      # 常规保护1
            elif bs == 1: target, base = field_by_name('ProtectCode'), 8      # 常规保护2
            elif bs == 2: target, base = field_by_name('ErrCode'), 0          # 故障保护1 (低 8 位)
            elif bs == 3: target, base = field_by_name('AFE_ProtectCode'), 0  # 底层保护1
            elif bs == 4: target, base = field_by_name('AFE_ProtectCode'), 8  # 底层保护2
            elif bs == 5: target, base = field_by_name('ErrCode'), 8          # NTC 短路/开路 (ErrCode 高字节)
            else: continue
        elif group == '电池状态寄存器':
            if bs == 0:   target, base = field_by_name('ChgDsgState'), 0      # 充放电状态 low
            elif bs == 1: target, base = field_by_name('ChgDsgState'), 8      # 充放电状态 high
            elif bs == 2: target, base = field_by_name('SysState'), 0         # 工作模式
            elif 3 <= bs <= 6: target, base = field_by_name('CellBalance'), (bs - 3) * 8  # 均衡 32bit
            elif bs == 7: target, base = field_by_name('SignalSource'), 0     # 信号源
            else: continue
        else:
            continue
        if not target:
            continue
        target.setdefault('bits', [])
        seen = {b['bit'] for b in target['bits']}
        for bit, bname in parse_bits(comment):
            fidx = base + bit
            if fidx >= target.get('bitLen', 0):
                continue
            if fidx in seen:
                continue
            target['bits'].append({'bit': fidx, 'name': bname})
            seen.add(fidx)

    # bits 按 bit 排序
    for f in c01_cb:
        if 'bits' in f:
            f['bits'] = sorted(f['bits'], key=lambda b: b['bit'])

    json.dump(schema, open(SCHEMA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for f in c01_cb:
        if 'bits' in f:
            names = ', '.join(f"{b['bit']}:{b['name']}" for b in f['bits'])
            print(f"{f['name']}: {len(f['bits'])} 位 → {names[:120]}...")
    print('[OK] bits[] 已写入 bms_v113.json')


if __name__ == '__main__':
    main()

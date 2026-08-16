#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 EMS xlsx 转储解析字段表 → schema 字段骨架 JSON (P4 EMS 长尾转写辅助).

用法: python .tmp/parse-ems-dump.py
输出: .tmp/ems-schema-fields.json  (每命令/方向的字段骨架)
字段行判定: 命令行 cells[2] 匹配 0x..; 字段行 cells[5]/[6] 为数字 (起始位/长度Bit)
备注列含换行的行会被污染 (起始位非数字), 自动跳过并计数, 供人工核对。
"""
import json
import re
from collections import OrderedDict

SRC = '.tmp/ems-xlsx-dump.txt'
OUT = '.tmp/ems-schema-fields.json'

lines = open(SRC, encoding='utf-8').read().splitlines()
result = OrderedDict()   # cmd -> {dir: [fields]}
cur_cmd, cur_dir = None, None
skipped_note_lines = 0

def flush_field(name, sb, bl, unit, scale, offset):
    f = OrderedDict([('name', name), ('startBit', sb), ('bitLen', bl)])
    if unit and unit != '-':
        f['unit'] = unit
    if scale is not None:
        f['scale'] = scale
    if offset:
        f['offset'] = offset
    result.setdefault(cur_cmd, {}).setdefault(cur_dir, []).append(f)


def _scale(v):
    if not v or v == '-':
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _offset(v):
    if not v or v == '-':
        return 0
    try:
        return int(v)
    except ValueError:
        return 0

for line in lines:
    s = line.strip()
    # 注意: 带标题列的 MB 行 (如 "控制指令 | 0xAA 0xAA | ...") 不以 | 开头, 不能按 startswith 过滤
    if not s:
        continue
    cells = [c.strip() for c in s.strip('|').split('|')]
    # 命令行: 以 '0xAA 0xAA' 列定位 (MB 行可能带标题列)
    if '0xAA 0xAA' in cells:
        i0 = cells.index('0xAA 0xAA')
        if i0 + 4 < len(cells) and re.match(r'^0x[0-9A-Fa-f]{2}$', cells[i0 + 2] or '') and cells[i0 + 3] in ('MB', 'CB'):
            cur_cmd, cur_dir = cells[i0 + 2], cells[i0 + 3]
            # 命令行内嵌首个字段 (如 0xEC MB 行尾的 "0 | 1 | Test_Mode")
            if i0 + 8 < len(cells) and cells[i0 + 6].isdigit() and cells[i0 + 7].isdigit() and cells[i0 + 8]:
                flush_field(cells[i0 + 8], int(cells[i0 + 6]), int(cells[i0 + 7]),
                            cells[i0 + 9] if i0 + 9 < len(cells) else '',
                            _scale(cells[i0 + 10] if i0 + 10 < len(cells) else ''),
                            _offset(cells[i0 + 11] if i0 + 11 < len(cells) else ''))
            continue
    # 字段行: 起始位/长度均为数字 (列: [6]=起始位 [7]=长度Bit [8]=名称 [9]=单位 [10]=精度 [11]=OFFSET)
    if len(cells) >= 12 and cells[6].isdigit() and cells[7].isdigit():
        name = cells[8]
        if not name:
            continue
        sb, bl = int(cells[6]), int(cells[7])
        unit = cells[9] if len(cells) > 9 else ''
        flush_field(name, sb, bl, unit, _scale(cells[10] if len(cells) > 10 else ''), _offset(cells[11] if len(cells) > 11 else ''))
    else:
        skipped_note_lines += 1  # 备注换行污染行 / 表头行

open(OUT, 'w', encoding='utf-8').write(json.dumps(result, ensure_ascii=False, indent=1))
print(f'[OK] 解析完成: {sum(len(v) for d in result.values() for v in d.values())} 字段 / {len(result)} 命令')
for cmd, dirs in result.items():
    for d, fs in dirs.items():
        print(f'  {cmd} {d}: {len(fs)} 字段 (skip {skipped_note_lines} 污染行)')

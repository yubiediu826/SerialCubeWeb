#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""EMS schema 补全生成器 (P4).

读取 .tmp/ems-schema-fields.json (转储解析骨架) → 生成 commands 字段表 →
合并进 tools/schemas/ems_v143.json。保留 0xE1/0xEC 手写精细版 (含 enum/bitset 位定义)。
type 推断: bitLen→u8/u16/u32/ascii; 名称含 State/Code/Flag/Status/Mos → bitset; 含 SN → ascii;
含 Temp 且 scale 有小数 → i16; 其余 u 系列, 不确定处标 note 待固件确认。
用法: python tools/scripts/gen-ems-schema.py
"""
from __future__ import annotations

import json
import math
import re
from collections import OrderedDict

SCHEMA = 'tools/schemas/ems_v143.json'
FIELDS = '.tmp/ems-schema-fields.json'

KEEP = {'0xE1', '0xEC'}  # 手写精细版 (enum/bitset 位定义), 不被覆盖


def infer_type(name: str, bl: int, scale, unit) -> str:
    if bl == 1:
        return 'u8'
    if re.search(r'SN', name) and bl >= 40:
        return 'ascii'
    if re.search(r'(State|Code|Flag|Status|Mos|Protect|Err)', name) and bl <= 32:
        return 'bitset'
    if scale is not None and scale != 1 and scale < 1 and re.search(r'Temp|Curr|Volt', name):
        return 'i16' if bl == 16 else ('i32' if bl == 32 else 'u8')
    if bl <= 8:
        return 'i8' if re.search(r'Temp', name) else 'u8'
    if bl <= 16:
        return 'i16' if re.search(r'(Temp|Curr|Dsg|Chg)', name) else 'u16'
    if bl <= 32:
        return 'i32' if re.search(r'(Curr|Power|Cap)', name) and re.search(r'(Dsg|Chg|Curr)', name) else 'u32'
    return 'u8'


def main() -> int:
    schema = json.load(open(SCHEMA, encoding='utf-8'))
    parsed = json.load(open(FIELDS, encoding='utf-8'))
    cmds = schema['commands']

    for cmd, dirs in parsed.items():
        if cmd in KEEP:
            continue
        entry = {'desc': f'EMS {cmd} (转储解析, 类型/枚举待固件确认)'}
        for d, fields in dirs.items():
            layout = {'len': 0, 'fields': []}
            max_bit = 0
            for f in fields:
                bl = int(f['bitLen'])
                if bl == 0:
                    continue
                nf = OrderedDict([('name', f['name']), ('type', infer_type(f['name'], bl, f.get('scale'), f.get('unit', ''))), ('startBit', f['startBit']), ('bitLen', bl)])
                if f.get('unit'):
                    nf['unit'] = f['unit']
                if f.get('scale') is not None:
                    nf['scale'] = f['scale']
                if f.get('offset'):
                    nf['offset'] = f['offset']
                if nf['type'] == 'bitset':
                    nf['note'] = '位定义见转储备注, 待固件确认'
                layout['fields'].append(nf)
                max_bit = max(max_bit, int(f['startBit']) + bl)
            layout['len'] = math.ceil(max_bit / 8)
            if not layout['fields']:
                # MB 空查询 (RES 预留) → 保底字段, 供 host_sim/编码器识别
                layout['fields'] = [{'name': 'RES', 'type': 'bytes', 'bitLen': 0}]
            entry['REQ' if d == 'MB' else 'RESP'] = layout
        cmds[cmd] = entry

    schema['commands'] = cmds
    schema['frame']['notes'].append('P4 补全: 0xE2-0xEB/0xED/0xEE 字段表由 .tmp/ems-xlsx-dump.txt 解析生成 (461 字段), 类型推断/枚举/位定义待固件确认')
    json.dump(schema, open(SCHEMA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'[OK] schema 补全完成: {len(cmds)} 命令')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

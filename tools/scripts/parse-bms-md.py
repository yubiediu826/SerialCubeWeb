#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""BMS md 命令字段表解析 → 补全 bms_v113.json 的 0x04-0x16 布局.

解析 docs/reference/BMS通信协议V1.13.md 各命令章节的「数据区」表格
(起始位/长度Bit/字段名/单位/精度/OFFSET), 保留已完整的 0x01/0x02/0x03。
字段名含 [0..N] → array; 名称含 SN 且 bitLen==128 → ascii; 否则按 bitLen 推断 u8/u16/u32/i16。
用法: python tools/scripts/parse-bms-md.py
"""
import json
import math
import re

MD = 'docs/reference/BMS通信协议V1.13.md'
SCHEMA = 'tools/schemas/bms_v113.json'

KEEP = {'0x01', '0x02', '0x03'}  # 已完整, 不覆盖


def infer_field(name, bl, scale):
    m = re.match(r'^(.+)\[0\.\.(\d+)\]$', name)
    if m:
        base, hi = m.group(1), int(m.group(2))
        count = hi + 1
        item_bits = bl // count
        return {'name': base, 'type': 'array', 'item': {'type': 'u16' if item_bits == 16 else 'u8', 'bitLen': item_bits, 'count': count}}
    if 'SN' in name and bl == 128:
        return {'name': name, 'type': 'ascii', 'bitLen': bl}
    t = 'u8' if bl <= 8 else ('u16' if bl <= 16 else 'u32')
    if re.search(r'Temp', name) and bl <= 16:
        t = 'i16' if bl == 16 else 'i8'
    return {'name': name, 'type': t, 'bitLen': bl}


def main():
    lines = open(MD, encoding='utf-8').read().splitlines()
    schema = json.load(open(SCHEMA, encoding='utf-8'))
    # 清理: 删除 0x04-0x16 所有键 (含历史 0X 大写残留), 保留已完整的 0x01/0x02/0x03
    schema['commands'] = {k: v for k, v in schema['commands'].items() if k in KEEP}

    cur_cmd, cur_dir, cur_fields = None, None, []
    in_table = False
    all_fields = []  # (cmd, dir, [{sb,bl,name,unit,scale}])

    for line in lines:
        s = line.strip()
        m = re.match(r'^## \d+\. 命令 (0x[0-9A-Fa-f]+)', s)
        if m:
            cur_cmd = '0x' + m.group(1).replace('0x', '').replace('0X', '').upper()  # 规范化 0x03
            continue
        m = re.match(r'^### \d+\.\d+ (MB|CB)', s)
        if m:
            cur_dir = m.group(1)
            continue
        if '#### 数据区' in s:
            in_table = True
            cur_fields = []
            continue
        if in_table and s.startswith('|'):
            cells = [c.strip() for c in s.strip('|').split('|')]
            if not cells or cells[0] in ('起始位', '字节偏移', ':-----', ':-------'):
                continue
            if len(cells) >= 3 and cells[0].isdigit() and cells[1].isdigit():
                cur_fields.append({
                    'sb': int(cells[0]), 'bl': int(cells[1]), 'name': cells[2],
                    'unit': cells[3] if len(cells) > 3 else '',
                    'scale': cells[4] if len(cells) > 4 else '',
                })
            continue
        if in_table and s and not s.startswith('|'):
            if cur_fields:
                all_fields.append((cur_cmd, cur_dir, cur_fields))
            in_table = False
            cur_fields = []

    # 按命令/方向分组
    from collections import OrderedDict
    grouped = OrderedDict()
    for cmd, dir_, fields in all_fields:
        if cmd in KEEP:
            continue
        grouped.setdefault(cmd, {}).setdefault(dir_, []).extend(fields)

    for cmd, dirs in grouped.items():
        if cmd not in schema['commands']:
            schema['commands'][cmd] = {'desc': f'BMS {cmd} (md 解析, 待固件确认)'}
        for dir_, fields in dirs.items():
            layout_fields = []
            max_bit = 0
            for f in fields:
                nf = infer_field(f['name'], f['bl'], f['scale'])
                nf['startBit'] = f['sb']
                if f['unit'] and f['unit'] != '-':
                    nf['unit'] = f['unit']
                scale = None
                try:
                    scale = float(f['scale'])
                except (ValueError, TypeError):
                    scale = None
                if scale is not None and scale != 1:
                    nf['scale'] = scale
                layout_fields.append(nf)
                max_bit = max(max_bit, f['sb'] + f['bl'])
            layout = {'len': math.ceil(max_bit / 8), 'fields': layout_fields}
            schema['commands'][cmd]['MB' if dir_ == 'MB' else 'CB'] = layout

    # ---- 手工补丁: 无「数据区」标题的简单命令 + 引用式复用 ----
    def reserved(l):
        return {'len': l, 'fields': [{'name': 'reserved', 'type': 'u8', 'bitLen': 8}]}

    def ack():
        return {'len': 1, 'fields': [{'name': 'ack', 'type': 'u8', 'bitLen': 8, 'enum': {'0': '成功', '1': '失败'}}]}

    def ascii_sn():
        return {'len': 16, 'fields': [{'name': 'SN', 'type': 'ascii', 'startBit': 0, 'bitLen': 128}]}

    import copy
    patch = {
        '0x05': {'MB': reserved(1), 'CB': {'len': 95, 'fields': copy.deepcopy(schema['commands']['0x02']['MB']['fields'])}},
        '0x06': {'MB': reserved(1), 'CB': {'len': 204, 'fields': copy.deepcopy(schema['commands']['0x04']['MB']['fields'])}},
        '0x08': {'MB': reserved(1), 'CB': ascii_sn()},
        '0x09': {'MB': {'len': 1, 'fields': [{'name': 'enable', 'type': 'u8', 'bitLen': 8, 'enum': {'0': '关均衡', '1': '开均衡'}}]}, 'CB': ack()},
        '0x0A': {'MB': reserved(1)},
        '0x0B': {'CB': ack()},   # CB ack 无「数据区」标题, 脚本未解析, 手工补
        '0x0C': {'CB': ack()},
        '0x04': {'CB': ack()},   # OCV 配置 CB ack
        '0x07': {'CB': ack()},   # SN 写入 CB ack
        '0x16': {'MB': {'len': 0, 'fields': [{'name': 'reserved', 'type': 'bytes', 'bitLen': 0}]}},
        # 升级类 0x10-0x15 (md §16)
        '0x10': {'MB': {'len': 4, 'fields': [{'name': 'DEV_T', 'type': 'ascii', 'startBit': 0, 'bitLen': 32}]}, 'CB': ack()},
        '0x11': {'MB': {'len': 2, 'fields': [{'name': 'ALL_PAC', 'type': 'u16', 'bitLen': 16}]}, 'CB': ack()},
        '0x12': {'MB': {'len': 4, 'fields': [{'name': 'ALL_SIZE', 'type': 'u32', 'bitLen': 32}]}, 'CB': ack()},
        '0x13': {'MB': {'len': 2, 'fields': [{'name': 'ALL_CHECK', 'type': 'u16', 'bitLen': 16}]}, 'CB': ack()},
        '0x14': {'MB': {'len': 0, 'fields': [{'name': 'PAC_NUM', 'type': 'u16', 'bitLen': 16}, {'name': 'PAC', 'type': 'bytes', 'bitLen': 0, 'todo': '变长 8*i 字节'}]}, 'CB': ack()},
        '0x15': {'CB': {'len': 1, 'fields': [{'name': 'UP_STA', 'type': 'u8', 'bitLen': 8, 'enum': {'0': '失败', '1': '成功'}}]}},
    }
    for cmd, dirs in patch.items():
        schema['commands'].setdefault(cmd, {'desc': f'BMS {cmd} (md 解析+补丁)'})
        for d, layout in dirs.items():
            schema['commands'][cmd]['MB' if d == 'MB' else 'CB'] = layout

    json.dump(schema, open(SCHEMA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for cmd, dirs in grouped.items():
        for d, fs in dirs.items():
            print(f'{cmd} {d}: {len(fs)} 字段 (len={math.ceil(max((f["sb"]+f["bl"]) for f in fs)/8) if fs else 0})')
    print('[OK] bms_v113.json 补全完成')


if __name__ == '__main__':
    main()

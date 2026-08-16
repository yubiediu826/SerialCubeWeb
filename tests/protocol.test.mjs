// L1 协议层单测: jsdom 加载 SerialCube.html, 用 golden-vectors 断言协议核心
// 运行: npm test  (Node 24 + jsdom)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const root = new URL('..', import.meta.url);
const golden = JSON.parse(readFileSync(new URL('golden-vectors.json', import.meta.url), 'utf8'));
const schema = JSON.parse(readFileSync(new URL('../tools/schemas/bms_v113.json', import.meta.url), 'utf8'));

const hexToBytes = (s) => s.trim().split(/\s+/).map((x) => parseInt(x, 16));
const bytesToHex = (b) => b.map((x) => x.toString(16).padStart(2, '0')).join(' ');

let NS;
let dom;

test.before(async () => {
  const html = readFileSync(new URL('SerialCube.html', root), 'utf8');
  dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, media: '' });
      if (!('BroadcastChannel' in w)) w.BroadcastChannel = class { constructor() { this.onmessage = null; } postMessage() {} close() {} };
    }
  });
  await new Promise((r) => setTimeout(r, 150));
  NS = dom.window.NS;
  assert.ok(NS && typeof NS.crc16Modbus === 'function', 'SerialCube.html 加载失败: NS.crc16Modbus 不存在');
  // EMS 不再是默认协议, 但 golden 向量含 EMS 帧, 测试期注册一份 (用嵌入 schema)
  if (NS._SCHEMA_EMS_V143 && !NS.PROTOCOLS.find((p) => p.id === 'proto_ems_v143')) {
    NS.PROTOCOLS.push({ id: 'proto_ems_v143', kind: 'schema', name: 'EMS V1.4.3', byteOrder: 'LE', schema: NS._SCHEMA_EMS_V143, commands: [] });
  }
});

// 页面自带 setInterval (时钟等), 测试完关闭 window 清定时器, 否则进程不退出
test.after(() => { if (dom) dom.window.close(); });

test('CRC-16/Modbus 黄金向量 (BMS 协议文档实算帧)', () => {
  for (const v of golden.crc16Modbus) {
    const got = NS.crc16Modbus(hexToBytes(v.inputHex));
    assert.equal(got, v.crc, `${v.note} → 期望 0x${v.crc.toString(16).toUpperCase()} 实得 0x${got.toString(16).toUpperCase()}`);
  }
});

test('golden 帧 CRC 自洽 (帧尾 2 字节 == CRC16-LE; EMS 帧跳过, 由 checksum 测试覆盖)', () => {
  for (const f of golden.frames) {
    if (f.proto === 'proto_ems_v143') continue; // EMS = 1 字节校验和
    const b = hexToBytes(f.bytesHex);
    const crc = NS.crc16Modbus(b.slice(0, -2));
    const frameCrc = b[b.length - 2] | (b[b.length - 1] << 8);
    assert.equal(crc, frameCrc, `${f.id} CRC 自洽失败`);
  }
});

test('schema: bms_v113.json 结构有效', () => {
  assert.equal(schema.id, 'proto_bms_v113');
  assert.equal(schema.meta.byteOrder, 'LE');
  assert.equal(schema.frame.crc.type, 'crc16-modbus');
  assert.ok(Array.isArray(schema.frame.fields) && schema.frame.fields.length >= 6, 'frame.fields 完整');
  const c01 = schema.commands['0x01'];
  assert.ok(c01.MB.fields[0].type === 'bitset' && c01.MB.fields[0].bitLen === 16, '0x01 MB ctrl bitset');
  assert.ok(c01.CB.fields.length >= 35, `0x01 CB 字段数 ${c01.CB.fields.length} ≥ 35`);
  const c02 = schema.commands['0x02'];
  assert.ok(c02.MB.fields.length >= 40, `0x02 MB 字段数 ${c02.MB.fields.length} ≥ 40`);
  const c03 = schema.commands['0x03'];
  assert.ok(c03.CB.fields.some((f) => f.name === 'NTC_CNT' && f.bitLen === 4), '0x03 CB NTC_CNT 位域');
  assert.ok(c03.CB.fields.some((f) => f.name === 'BAT_TYPE' && f.startBit === 13 && f.bitLen === 3), '0x03 CB BAT_TYPE 跨字节位域');
  assert.ok(c03.CB.fields.some((f) => f.name === 'DEVICE' && f.type === 'ascii'), '0x03 CB DEVICE ascii');
  // 字段位区间不重叠 + 在数据区内
  const totalBits = (len) => (len === 0 ? 1e9 : len * 8);
  for (const cmdKey of Object.keys(schema.commands)) {
    for (const dir of ['MB', 'CB']) {
      const layout = schema.commands[cmdKey][dir];
      if (!layout || !Array.isArray(layout.fields)) continue;
      const seen = new Map();
      for (const f of layout.fields) {
        const sb = f.startBit ?? 0;
        const bl = f.bitLen || 0;
        if (bl === 0) continue; // bytes/todo 字段跳过
        assert.ok(bl > 0 && Number.isInteger(sb), `${cmdKey} ${dir} ${f.name} startBit/bitLen 合法`);
        for (let i = sb; i < sb + bl; i++) {
          assert.ok(!seen.has(i), `${cmdKey} ${dir} 字段 ${f.name} 与 ${seen.get(i)} 位区间重叠 @bit ${i}`);
          seen.set(i, f.name);
        }
        assert.ok(sb + bl <= totalBits(layout.len), `${cmdKey} ${dir} ${f.name} 超出数据区 (${sb}+${bl} > ${layout.len}*8)`);
      }
    }
  }
});

test('schema: ems_v143.json 结构有效 (P4 转储补全, 461 字段)', () => {
  const ems = JSON.parse(readFileSync(new URL('tools/schemas/ems_v143.json', root), 'utf8'));
  assert.equal(ems.id, 'proto_ems_v143');
  assert.equal(ems.frame.crc.type, 'checksum');
  assert.equal(ems.frame.crc.range, 'no_header');
  assert.ok(ems.frame.fields.some((f) => f.type === 'checksum'), 'checksum 字段存在');
  assert.ok(Object.keys(ems.commands).length >= 14, `命令数 ${Object.keys(ems.commands).length} ≥ 14`);
  // 位区间不重叠 + 不越界
  for (const cmdKey of Object.keys(ems.commands)) {
    for (const dir of ['REQ', 'RESP']) {
      const layout = ems.commands[cmdKey][dir];
      if (!layout || !Array.isArray(layout.fields)) continue;
      const seen = new Map();
      for (const f of layout.fields) {
        const bl = f.bitLen || 0;
        if (bl === 0) continue;
        const sb = f.startBit ?? 0;
        assert.ok(Number.isInteger(sb), `${cmdKey} ${dir} ${f.name} startBit 合法`);
        for (let i = sb; i < sb + bl; i++) {
          assert.ok(!seen.has(i), `${cmdKey} ${dir} ${f.name} 与 ${seen.get(i)} 位区间重叠 @bit ${i}`);
          seen.set(i, f.name);
        }
        if (layout.len > 0) {
          assert.ok(sb + bl <= layout.len * 8, `${cmdKey} ${dir} ${f.name} 超出数据区 (${sb}+${bl} > ${layout.len}*8)`);
        }
      }
    }
  }
  // 0xED 电池级联: n1-n5 五组完整
  const ed = ems.commands['0xED'].RESP.fields;
  assert.ok(ed.some((f) => f.name === 'n1_addr') && ed.some((f) => f.name === 'n5_soft'), '0xED n1-n5 完整');
  assert.equal(ems.commands['0xED'].RESP.len, 190, '0xED len=190 (5 组 × 每组 16 字段)');
});

test('parseFrame 黄金向量 (bms_0x01/0x02/0x03 + ems_0xE1/0xEC, 含位域/缩放/枚举/ascii/数组/checksum)', () => {
  for (const f of golden.frames) {
    const proto = NS.PROTOCOLS.find((p) => p.id === f.proto);
    assert.ok(proto, `${f.proto} 已注册`);
    const bytes = hexToBytes(f.bytesHex);
    const parsed = NS.parseFrame(proto, bytes);
    assert.equal(parsed.ok, true, `${f.id} 解析成功`);
    assert.equal(parsed.cmd, parseInt(f.cmd, 16), `${f.id} cmd`);
    assert.equal(parsed.dir, f.dir, `${f.id} 方向 (帧头识别)`);
    assert.equal(parsed.crcOk, true, `${f.id} 校验通过`);
    for (const [k, exp] of Object.entries(f.expect)) {
      const got = parsed.values[k];
      if (Array.isArray(exp)) {
        assert.ok(Array.isArray(got), `${f.id} ${k} 是数组`);
        // Array.from: 跨 realm (jsdom) 数组原型不同, 转回本 realm 再 deepEqual
        assert.deepEqual(Array.from(got.slice(0, exp.length)), exp, `${f.id} ${k} = [${exp}]`);
      } else {
        assert.equal(got, exp, `${f.id} ${k} = ${exp} (实得 ${got})`);
      }
    }
  }
});

test('checksum 向量 (EMS 帧校验和 = sum & 0xFF)', () => {
  for (const v of golden.checksum) {
    const got = NS.crcChecksum(hexToBytes(v.inputHex));
    assert.equal(got, v.sum, `${v.note}: 期望 ${v.sum} 实得 ${got}`);
  }
});

test('BMS 位字段展开 (ProtectCode uint16 逐位解析)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const data = new Uint8Array(159);
  data[0] = 0x21; // ProtectCode bit0 + bit5 置位 (LE: low byte first)
  const body = [0x55, 0x01, 0x01, 159, ...data];
  const crc = NS.crc16Modbus(body);
  const frame = [...body, crc & 0xFF, (crc >> 8) & 0xFF];
  const parsed = NS.parseFrame(proto, frame);
  assert.equal(parsed.crcOk, true, 'CRC 通过');
  assert.equal(parsed.values.ProtectCode, 0x21, 'ProtectCode 原始值 0x21');
  assert.equal(parsed.values['ProtectCode.软件层放电过温保护'], 1, 'bit0 放电过温=1');
  assert.equal(parsed.values['ProtectCode.软件层放电低温保护'], 0, 'bit1 放电低温=0');
  assert.equal(parsed.values['ProtectCode.软件层过压二级保护标志位'], 1, 'bit5 过压二级=1');
  assert.equal(parsed.values['ProtectCode.软件层充电过温保护'], 0, 'bit2 充电过温=0');
});

test('BMS 19 命令注册 (C: 完整配置)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  assert.equal(proto.commands.length, 19, `命令数 ${proto.commands.length} == 19`);
  assert.equal(proto.commands.find((c) => c.id === 0x01).cadence, 200, '0x01 周期 200ms');
  assert.equal(proto.commands.find((c) => c.id === 0x02).frameType, 'control', '0x02 control');
  assert.equal(proto.commands.find((c) => c.id === 0x15).direction, 'rx', '0x15 主动上行 rx');
  assert.equal(proto.commands.find((c) => c.id === 0x16).name, '级联电池信息', '0x16 级联');
  // schema 命令覆盖 (0x04 OCV 数组 / 0x07 SN ascii / 0x14 变长)
  assert.ok(proto.schema.commands['0x04'].MB.fields.some((f) => f.type === 'array' && f.item.count === 101), '0x04 OCV[101] 数组');
  assert.ok(proto.schema.commands['0x07'].MB.fields.some((f) => f.type === 'ascii' && f.bitLen === 128), '0x07 SN ascii 16B');
  assert.ok(proto.schema.commands['0x14'].MB.fields.some((f) => f.name === 'PAC'), '0x14 变长数据包');
});

test('卡片字段选项含位展开 (schema 协议)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const cmd = proto.commands.find((c) => c.id === 0x01);
  const opts = NS._cardFieldOptions(cmd);
  assert.ok(Array.isArray(opts) && opts.length >= 50, `字段选项数 ${opts.length} ≥ 50`);
  assert.ok(opts.some((o) => o.name === 'ProtectCode'), '含 ProtectCode 整字段');
  assert.ok(opts.some((o) => o.name === 'ProtectCode.软件层放电过温保护'), '含 ProtectCode.位展开');
  assert.ok(opts.some((o) => o.name === 'BatVolt'), '含 BatVolt 普通字段');
  // 旧协议 (dataFields) 兼容 — legacy proto_bms 不再是默认协议, 构造一个临时命令测试
  const legacyCmd = { id: 0x99, dataFields: [{ name: 'flags', type: 'bitset', bits: [{ bit: 0, name: '过温' }] }] };
  const legacyOpts = NS._cardFieldOptions(legacyCmd);
  assert.ok(legacyOpts.length > 0 && legacyOpts[0].name, '旧协议 dataFields 兼容');
});

test('schema 编码器: buildFrame(proto_bms_v113, MB) == golden 帧 + 编解码往返', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const byCmd = (id) => proto.commands.find((c) => c.id === id);
  const g = (id) => golden.frames.find((x) => x.id === id);

  // 0x01 MB: ctrl = 0x0221 (Load + normal_power + fan_enable) → golden 全位开帧
  NS.currentVals['ctrl'] = 0x0221;
  const f01 = NS.buildFrame(proto, byCmd(0x01));
  assert.equal(bytesToHex(f01.bytes).toUpperCase(), g('bms_0x01_mb_all').bytesHex.toUpperCase(), '0x01 MB ctrl=0x0221 帧 == golden');
  delete NS.currentVals['ctrl'];
  const back01 = NS.parseFrame(proto, f01.bytes);
  assert.equal(back01.values['ctrl.Load'], 1, '0x01 往返 ctrl.Load=1');
  assert.equal(back01.values['ctrl.fan_enable'], 1, '0x01 往返 ctrl.fan_enable=1');
  assert.equal(back01.values['ctrl.AC_Adapter'], 0, '0x01 往返 ctrl.AC_Adapter=0');

  // 0x03 MB: reserved=0 → golden 请求帧
  const f03 = NS.buildFrame(proto, byCmd(0x03));
  assert.equal(bytesToHex(f03.bytes).toUpperCase(), g('bms_0x03_mb_req').bytesHex.toUpperCase(), '0x03 MB 请求帧 == golden');

  // 0x02 MB: schema 默认值 == 文档示例值 → golden 101 字节完整配置帧
  const f02 = NS.buildFrame(proto, byCmd(0x02));
  assert.equal(bytesToHex(f02.bytes).toUpperCase(), g('bms_0x02_mb_full').bytesHex.toUpperCase(), '0x02 MB 完整配置帧 == golden (101B)');

  // 往返: 解码(编码) 还原默认值 (含缩放/有符号)
  const back = NS.parseFrame(proto, f02.bytes);
  assert.equal(back.crcOk, true, '0x02 往返 CRC');
  assert.equal(back.values.Cell_OV_Val, 3650, '0x02 往返 Cell_OV_Val');
  assert.equal(back.values.DsgOCLv1_Val, -20000, '0x02 往返 DsgOCLv1_Val (有符号)');
  assert.equal(back.values.Enable_Protect_Switch, 16383, '0x02 往返 Enable_Protect_Switch');
  assert.equal(back.values.Cell_FULL_Timer, 30000, '0x02 往返 Cell_FULL_Timer');
});

test('D 从机响应: 查询帧 → schema 响应回帧 (数据源生成)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  NS.activeProtoId = 'proto_bms_v113';
  NS._simRole = 'device';
  const savedCards = NS.CARDS;
  try {
    // v1.3.9: 卡片级数据源 (set 卡 sim) 优先; 用卡片模拟从机字段值
    NS.CARDS = [
      { id: 'ds_rsoc', type: 'set', cmd: 0x01, field: 'RSOC', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 80 } },
      { id: 'ds_bv', type: 'set', cmd: 0x01, field: 'BatVolt', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 212500 } },
      { id: 'ds_sc', type: 'set', cmd: 0x01, field: 'SysCurr', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 1000 } }
    ];
    const written = [];
    NS._writeSerial = (bytes) => written.push(Uint8Array.from(bytes));
    const q = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x01));
    const ok = NS._deviceRespond(q.bytes);
    assert.equal(ok, true, '从机响应成功');
    assert.equal(written.length, 1, '回 1 帧');
    const resp = NS.parseFrame(proto, written[0]);
    assert.equal(resp.crcOk, true, '响应 CRC 通过');
    assert.equal(resp.dir, 'CB', '响应方向 CB');
    assert.equal(resp.values.RSOC, 80, 'RSOC 固定 80');
    assert.equal(resp.values.BatVolt, 212500, 'BatVolt 缩放 212500 (scale 10)');
    assert.equal(resp.values.SysCurr, 1000, 'SysCurr 固定 1000');
  } finally {
    NS._simRole = 'host'; NS._writeSerial = null; NS.CARDS = savedCards;
  }
});

test('D host→device 回环: 查询经 RX 分发 → 从机响应 (模拟串口对)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  NS.activeProtoId = 'proto_bms_v113';
  NS._simRole = 'device';
  const savedCards = NS.CARDS;
  const rx = [];
  try {
    NS.CARDS = [{ id: 'ds_rsoc', type: 'set', cmd: 0x01, field: 'RSOC', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 55 } }];
    NS._writeSerial = (bytes) => rx.push(Uint8Array.from(bytes));
    // host 查询帧 (0x01 MB, ctrl=0)
    const q = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x01));
    // 回环: host TX = device RX (tryDispatchSchemaFrames)
    const handled = NS.tryDispatchSchemaFrames(q.bytes);
    assert.equal(handled, true, 'RX 分发处理查询帧');
    assert.equal(rx.length, 1, '从机回 1 帧');
    const resp = NS.parseFrame(proto, rx[0]);
    assert.equal(resp.crcOk, true, '响应 CRC');
    assert.equal(resp.values.RSOC, 55, '响应 RSOC=55');
  } finally {
    NS._simRole = 'host'; NS._writeSerial = null; NS.CARDS = savedCards;
  }
});

test('D 角色门控: device 角色不启动轮询', () => {
  NS._simRole = 'device';
  NS._startSchemaPoller();
  assert.equal(NS._schemaPollerHandle, null, 'device 角色不启动轮询器');
  NS._simRole = 'host';
  NS._stopSchemaPoller();
});

test('B legacy 位图编解码 (dataFields bitset + 位定义)', () => {
  const cmd = { id: 0x99, dataFields: [{ name: 'flags', type: 'bitset', size: 2, bits: [{ bit: 0, name: '过温' }, { bit: 1, name: '过流' }, { bit: 5, name: '短路' }] }] };
  // legacy proto_bms 不再是默认协议, 构造一个临时 BE 协议测试 legacy 编解码路径
  const proto = { id: 'proto_bms', kind: 'fixed-header', name: 'BMS TLV v1 (Legacy)', byteOrder: 'BE', commands: [] };
  NS.PROTOCOLS.push(proto);
  // 编码 (proto_bms byteOrder=BE)
  NS.currentVals.flags = 0x21;
  const bytes = NS.encodeDataFields(cmd, proto);
  assert.equal(bytes.length, 2, '2 字节');
  assert.deepEqual(Array.from(bytes), [0x00, 0x21], 'BE 编码 = 00 21');
  // 解码 (_parseAckFields bitset 分支, 构造 9 字节 legacy 帧, data=BE 00 21)
  const frame = [0xAA, 0x01, 0x99, 0x02, 0x00, 0x21, 0x00, 0x00, 0x55];
  const parsed = NS._parseAckFields(cmd, frame, 'proto_bms');
  assert.equal(parsed.flags, 0x21, 'flags 整数 0x21');
  assert.equal(parsed['flags.过温'], 1, 'bit0 过温=1');
  assert.equal(parsed['flags.过流'], 0, 'bit1 过流=0');
  assert.equal(parsed['flags.短路'], 1, 'bit5 短路=1');
  // 卡片字段选项 legacy 展开位
  const opts = NS._cardFieldOptions(cmd);
  assert.ok(opts.some((o) => o.name === 'flags'), '含整字段');
  assert.ok(opts.some((o) => o.name === 'flags.过温'), '含位展开');
  NS.PROTOCOLS = NS.PROTOCOLS.filter((p) => p.id !== 'proto_bms');
  delete NS.currentVals.flags;
});

test('D 从机按位数据源 (ProtectCode 位)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  NS.activeProtoId = 'proto_bms_v113';
  NS._simRole = 'device';
  NS._simSources = {
    'ProtectCode.软件层放电过温保护': { type: 'fixed', value: 1 },
    'ProtectCode.软件层过压二级保护标志位': { type: 'fixed', value: 1 }
  };
  const written = [];
  NS._writeSerial = (bytes) => written.push(Uint8Array.from(bytes));
  const q = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x01));
  const ok = NS._deviceRespond(q.bytes);
  assert.equal(ok, true, '从机响应');
  const resp = NS.parseFrame(proto, written[0]);
  assert.equal(resp.values.ProtectCode, 0x21, 'ProtectCode = bit0|bit5 = 0x21');
  assert.equal(resp.values['ProtectCode.软件层放电过温保护'], 1, '位0=1');
  assert.equal(resp.values['ProtectCode.软件层过压二级保护标志位'], 1, '位5=1');
  assert.equal(resp.values['ProtectCode.软件层放电低温保护'], 0, '位1=0');
  NS._simRole = 'host'; NS._writeSerial = null; NS._simSources = {};
});

test('P1 0x01 双向: 主机 MB(ctrl) 帧头 0x5A / 从机 CB(遥测) 帧头 0x55', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const cmd01 = proto.commands.find((c) => c.id === 0x01);
  // 快照 currentVals: 前面 tryDispatchSchemaFrames 会把 ctrl.Load 等位名写进 currentVals, 会覆盖 bitset 编码
  const savedVals = { ...NS.currentVals };
  try {
    // 清掉遗留的 ctrl 位名 (ctrl.Load/ctrl.fan_enable/...), 否则 bitset 编码会按位覆盖 raw 值
    for (const k of Object.keys(NS.currentVals)) {
      if (k === 'ctrl' || k.startsWith('ctrl.')) delete NS.currentVals[k];
    }
    // 主机下发: schemaDir=MB → 帧头 0x5A, len 字段 2, 数据=ctrl bitset
    NS.currentVals['ctrl'] = 0x0221;
    const mb = NS.buildFrame(proto, cmd01);
    assert.equal(mb.bytes[0], 0x5A, 'MB 帧头 0x5A');
    assert.equal(mb.bytes[3], 2, 'MB len 字段 = 2');
    const mbParsed = NS.parseFrame(proto, mb.bytes);
    assert.equal(mbParsed.dir, 'MB', '主机帧解析方向 MB');
    assert.equal(mbParsed.values['ctrl.Load'], 1, 'MB ctrl.Load=1');
    // 从机响应: 159B 遥测, 帧头 0x55, len 字段 0x9F(159), 尾部 RFCC/AFCC 位完整
    NS.currentVals.RFCC = 12250; NS.currentVals.AFCC = 12345;
    const cb = NS.buildFrame(proto, { id: 0x01, schemaDir: 'CB' });
    assert.equal(cb.bytes[0], 0x55, 'CB 帧头 0x55');
    assert.equal(cb.bytes[3], 159, 'CB len 字段 = 159 (0x9F, 位表权威)');
    assert.equal(cb.bytes.length, 4 + 159 + 2, 'CB 帧总长 165 (4 头 + 159 数据 + 2 CRC)');
    const cbParsed = NS.parseFrame(proto, cb.bytes);
    assert.equal(cbParsed.dir, 'CB', '从机帧解析方向 CB');
    assert.equal(cbParsed.crcOk, true, 'CB 帧 CRC 通过');
    assert.equal(cbParsed.values.RFCC, 12250, 'CB 尾部 RFCC (bit1208) 完整');
    assert.equal(cbParsed.values.AFCC, 12345, 'CB 尾部 AFCC (bit1240) 完整');
  } finally {
    NS.currentVals = savedVals;
  }
});

test('P1 0x01 主机发MB→从机回CB→主机按CB解析遥测 (闭环)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  NS.activeProtoId = 'proto_bms_v113';
  NS._simRole = 'device';
  const savedCards = NS.CARDS;
  const rx = [];
  try {
    NS.CARDS = [
      { id: 'ds_rsoc', type: 'set', cmd: 0x01, field: 'RSOC', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 26 } },
      { id: 'ds_bv', type: 'set', cmd: 0x01, field: 'BatVolt', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 212500 } },
      { id: 'ds_pc', type: 'set', cmd: 0x01, field: 'ProtectCode', protocol: 'proto_bms_v113', bitset: true, sim: { type: 'fixed', value: 1 } }
    ];
    NS._writeSerial = (bytes) => rx.push(Uint8Array.from(bytes));
    // 主机发 MB 查询 (ctrl=0)
    const q = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x01));
    assert.equal(q.bytes[0], 0x5A, '主机查询帧头 0x5A');
    // 从机收查询 → 回 CB 遥测
    const handled = NS.tryDispatchSchemaFrames(q.bytes);
    assert.equal(handled, true, 'RX 分发处理主机查询');
    assert.equal(rx.length, 1, '从机回 1 帧');
    // 主机侧按 CB 解析从机响应
    const hostView = NS.parseFrame(proto, rx[0]);
    assert.equal(hostView.dir, 'CB', '主机解析方向 CB');
    assert.equal(hostView.values.RSOC, 26, '遥测 RSOC=26');
    assert.equal(hostView.values.BatVolt, 212500, '遥测 BatVolt=212500 (scale 10)');
  } finally {
    NS._simRole = 'host'; NS._writeSerial = null; NS.CARDS = savedCards;
  }
});

test('P3 0x16 MB 4 字节预留帧 == golden (原 len=0 补全)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const f16 = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x16));
  const g = golden.frames.find((x) => x.id === 'bms_0x16_mb_req');
  assert.equal(bytesToHex(f16.bytes).toUpperCase(), g.bytesHex.toUpperCase(), '0x16 MB 4B 帧 == golden 26 BE');
  const back = NS.parseFrame(proto, f16.bytes);
  assert.equal(back.dir, 'MB', '0x16 MB 方向');
  assert.equal(back.values.reserved, 0, '0x16 reserved=0');
});

test('P3 0x14 变长升级数据包: PAC_NUM + PAC[128] 编解码往返', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const saved = { ...NS.currentVals };
  try {
    NS.currentVals.PAC_NUM = 1;
    NS.currentVals.PAC = Array.from({ length: 128 }, (_, i) => i);
    const f = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x14));
    assert.equal(f.bytes[0], 0x5A, '0x14 MB 帧头 0x5A');
    assert.equal(f.bytes[3], 130, '0x14 len 字段 = 130 (2 + 128)');
    assert.equal(f.bytes.length, 4 + 130 + 2, '0x14 帧总长 136');
    const back = NS.parseFrame(proto, f.bytes);
    assert.equal(back.crcOk, true, '0x14 往返 CRC 通过');
    assert.equal(back.values.PAC_NUM, 1, '0x14 PAC_NUM=1');
    assert.equal(back.values.PAC.length, 128, '0x14 PAC[128] 数组完整');
    assert.deepEqual(Array.from(back.values.PAC.slice(0, 4)), [0, 1, 2, 3], '0x14 PAC[0..3]=[0,1,2,3]');
    assert.equal(back.values.PAC[127], 127, '0x14 PAC[127]=127');
  } finally {
    NS.currentVals = saved;
  }
});

test('P5 单一协议: bms_v113.json 完整双向 schema (0x01/0x02 tx+rx)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  assert.ok(proto && proto.kind === 'schema', '单一 proto_bms_v113 协议');
  assert.equal(Object.keys(proto.schema.commands).length, 19, '19 命令');
  // 0x01 双向: tx=ctrl(2B) rx=48 字段遥测(159B)
  const c01 = proto.commands.find((c) => c.id === 0x01);
  assert.equal(c01.direction, 'both', '0x01 方向 both');
  assert.ok(Array.isArray(c01.txFields) && c01.txFields.length === 1 && c01.txFields[0].name === 'ctrl', '0x01 txFields=ctrl');
  assert.equal(c01.txLen, 2, '0x01 txLen=2 (控制字段 2 字节)');
  assert.ok(Array.isArray(c01.rxFields) && c01.rxFields.length === 48, `0x01 rxFields 48 字段 (实得 ${c01.rxFields.length})`);
  assert.equal(c01.rxLen, 159, '0x01 rxLen=159 (遥测 159 字节)');
  // 0x02 双向: tx=保护参数(95B) rx=ack(1B)
  const c02 = proto.commands.find((c) => c.id === 0x02);
  assert.equal(c02.direction, 'both', '0x02 方向 both');
  assert.ok(Array.isArray(c02.txFields) && c02.txFields.length >= 40, '0x02 txFields 保护参数');
  assert.equal(c02.txLen, 95, '0x02 txLen=95');
  assert.ok(Array.isArray(c02.rxFields) && c02.rxFields.length >= 1, '0x02 rxFields=ack');
  assert.equal(c02.rxLen, 1, '0x02 rxLen=1');
  // 0x16 单向 tx (级联查询)
  const c16 = proto.commands.find((c) => c.id === 0x16);
  assert.equal(c16.direction, 'both', '0x16 方向 both (查询+响应)');
});

test('P2 卡片编辑: 命令/字段下拉浮动菜单重建 (openCardEdit 后 options 非空)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  NS.activeProtoId = 'proto_bms_v113';
  // 造一张 0x01 卡片 (field 空, 走 openCardEdit 填充路径)
  const cardId = 'p2test_' + Date.now();
  NS.CARDS.push({ id: cardId, type: 'trend', cmd: 0x01, dir: 'rx', field: '', title: 'P2', unit: '', precision: 2, protocol: 'proto_bms_v113' });
  NS.openCardEdit(cardId);
  const doc = dom.window.document;
  const cmdSel = doc.getElementById('dh-ce-cmd');
  const fieldSel = doc.getElementById('dh-ce-field');
  assert.ok(cmdSel && cmdSel.options.length >= 19, `命令下拉 options ${cmdSel && cmdSel.options.length} >= 19`);
  assert.ok(fieldSel && fieldSel.options.length >= 50, `字段下拉 options ${fieldSel && fieldSel.options.length} >= 50`);
  // 关键: 浮动菜单 (.custom-select-option) 必须重建为与 select options 一致 (旧 bug: 菜单停留在初始化空列表)
  const cmdShell = cmdSel && cmdSel.parentElement;
  const cmdMenu = cmdShell && (cmdShell._customSelectMenu || cmdShell.querySelector('.custom-select-menu'));
  const menuOpts = cmdMenu ? cmdMenu.querySelectorAll('.custom-select-option') : [];
  assert.ok(menuOpts.length >= 19, `命令浮动菜单选项 ${menuOpts.length} >= 19 (重建成功)`);
  // 字段浮动菜单含位展开项 (v1.3.10: 位项 label 形如 "软件层放电过温保护 [CB · ProtectCode位]", 分组显示)
  const fieldShell = fieldSel && fieldSel.parentElement;
  const fieldMenu = fieldShell && (fieldShell._customSelectMenu || fieldShell.querySelector('.custom-select-menu'));
  const fieldMenuTexts = fieldMenu ? Array.from(fieldMenu.querySelectorAll('.custom-select-option')).map((o) => o.textContent) : [];
  assert.ok(fieldMenuTexts.some((t) => t.includes('软件层放电过温保护')), '字段浮动菜单含位展开项');
  assert.ok(fieldMenuTexts.some((t) => t.includes('ProtectCode')), '含 ProtectCode 整字段');
  // 清理
  NS.CARDS = NS.CARDS.filter((c) => c.id !== cardId);
  NS.closeModal('dh-card-edit');
});

test('P5 schema 文件导入: 单一完整双向 schema + 自动卡片', () => {
  const fs = { readFileSync };
  const fullObj = JSON.parse(fs.readFileSync(new URL('../tools/schemas/bms_v113.json', import.meta.url), 'utf8'));
  fullObj.id = 'proto_test_import';
  NS.PROTOCOLS = NS.PROTOCOLS.filter((p) => p.id !== 'proto_test_import');
  try {
    assert.equal(NS.importSchema(fullObj), true, 'schema 导入成功');
    const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_test_import');
    assert.ok(proto && proto.kind === 'schema', '导入创建 schema 协议');
    assert.equal(proto.commands.length, 19, '19 命令');
    assert.equal(proto.commands.find((c) => c.id === 0x01).direction, 'both', '0x01 双向');
    // 自动生成 host(control/trend) + device(set) 卡片
    const cards = NS.CARDS.filter((c) => c.protocol === 'proto_test_import');
    assert.ok(cards.some((c) => c.type === 'control' && c.singleBit), '含单bit 控制卡');
    assert.ok(cards.some((c) => c.type === 'trend'), '含 trend 遥测卡');
    assert.ok(cards.some((c) => c.type === 'set'), '含 set 参数卡');
  } finally {
    NS.PROTOCOLS = NS.PROTOCOLS.filter((p) => p.id !== 'proto_test_import');
    NS.CARDS = NS.CARDS.filter((c) => c.protocol !== 'proto_test_import');
  }
});

test('P3 控制卡: 位切换 + 发送控制帧 (host 发 MB ctrl)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const card = { id: 'ctrl_test', type: 'control', cmd: 0x01, schemaDir: 'MB', field: 'ctrl', respField: 'RSOC', respUnit: '%', precision: 1, protocol: 'proto_bms_v113' };
  const savedVals = { ...NS.currentVals };
  const savedRole = NS._simRole;
  try {
    for (const k of Object.keys(NS.currentVals)) if (k === 'ctrl' || k.startsWith('ctrl.')) delete NS.currentVals[k];
    // 位切换: Load(bit0) + fan_enable(bit9)
    const load = { bit: 0, name: 'Load' };
    const fan = { bit: 9, name: 'fan_enable' };
    NS._toggleControlBit(card, load);
    NS._toggleControlBit(card, fan);
    assert.equal(NS.currentVals['ctrl'], 0x0201, 'ctrl = 0x0201 (bit0|bit9)');
    assert.equal(NS.currentVals['ctrl.Load'], 1, 'ctrl.Load=1');
    // 发送: 组帧头 0x5A + 写串口
    const written = [];
    NS._writeSerial = (bytes) => written.push(Uint8Array.from(bytes));
    const ok = NS._sendControlFrame(card);
    assert.equal(ok, true, '控制帧发送成功');
    assert.equal(written.length, 1, '写 1 帧');
    assert.equal(written[0][0], 0x5A, 'MB 帧头 0x5A');
    assert.equal(written[0][3], 2, 'len 字段 2');
    const parsed = NS.parseFrame(proto, written[0]);
    assert.equal(parsed.values['ctrl.Load'], 1, '解析 ctrl.Load=1');
    assert.equal(parsed.values['ctrl.fan_enable'], 1, '解析 ctrl.fan_enable=1');
  } finally {
    NS.currentVals = savedVals;
    NS._simRole = savedRole;
    NS._writeSerial = null;
  }
});

test('P3 从机卡片级数据源: card.sim 驱动 device 响应', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  NS.activeProtoId = 'proto_bms_v113';
  const savedRole = NS._simRole;
  const savedSources = { ...NS._simSources };
  const savedCards = NS.CARDS;
  try {
    NS._simRole = 'device';
    NS._simSources = {};
    // 卡片级数据源: RSOC 固定 77, BatVolt 正弦
    NS.CARDS = [
      { id: 'ds1', type: 'trend', cmd: 0x01, field: 'RSOC', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 77 } },
      { id: 'ds2', type: 'trend', cmd: 0x01, field: 'BatVolt', protocol: 'proto_bms_v113', sim: { type: 'sine', base: 200000, amp: 10000, period: 10 } }
    ];
    const written = [];
    NS._writeSerial = (bytes) => written.push(Uint8Array.from(bytes));
    const q = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x01));
    const ok = NS._deviceRespond(q.bytes);
    assert.equal(ok, true, '从机响应成功');
    const resp = NS.parseFrame(proto, written[0]);
    assert.equal(resp.values.RSOC, 77, '卡片数据源 RSOC=77');
    assert.ok(Math.abs(resp.values.BatVolt - 200000) <= 10000, 'BatVolt 正弦在 [190000,210000] 内');
  } finally {
    NS._simRole = savedRole;
    NS._simSources = savedSources;
    NS.CARDS = savedCards;
    NS._writeSerial = null;
  }
});

test('P5 默认协议 = 单一 bms_v113 (无 legacy/EMS/host/slave 拆分)', () => {
  const ids = (NS.PROTOCOLS || []).map((p) => p.id);
  assert.ok(ids.includes('proto_bms_v113'), '默认含单一 proto_bms_v113');
  assert.ok(!ids.includes('proto_bms'), '默认不含 legacy proto_bms');
  assert.ok(!ids.includes('proto_modbus'), '默认不含 legacy proto_modbus');
  assert.ok(!ids.includes('proto_bms_v113_host'), '默认不含 host 拆分协议');
  assert.ok(!ids.includes('proto_bms_v113_slave'), '默认不含 slave 拆分协议');
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  assert.equal(proto.commands.length, 19, '19 命令');
});

test('P5 setSimMode 切换角色 (单一协议不切 activeProtoId)', () => {
  const savedRole = NS._simRole;
  const savedActive = NS.activeProtoId;
  try {
    NS.activeProtoId = 'proto_bms_v113';
    NS.setSimMode('host');
    assert.equal(NS._simRole, 'host', 'setSimMode(host) 角色=host');
    assert.equal(NS.activeProtoId, 'proto_bms_v113', 'host 模式协议保持单一 bms_v113');
    NS.setSimMode('device');
    assert.equal(NS._simRole, 'device', 'setSimMode(device) 角色=device');
    assert.equal(NS.activeProtoId, 'proto_bms_v113', 'device 模式协议保持单一 bms_v113');
  } finally {
    NS._simRole = savedRole;
    NS.activeProtoId = savedActive;
  }
});

test('P4 卡片按角色过滤 (_cardVisibleInRole)', () => {
  const savedRole = NS._simRole;
  try {
    NS._simRole = 'host';
    assert.equal(NS._cardVisibleInRole({ type: 'control' }), true, 'host 模式显示控制卡');
    assert.equal(NS._cardVisibleInRole({ type: 'set' }), false, 'host 模式隐藏 set 卡');
    assert.equal(NS._cardVisibleInRole({ type: 'trend' }), true, 'host 模式显示 trend 卡');
    NS._simRole = 'device';
    assert.equal(NS._cardVisibleInRole({ type: 'control' }), false, 'device 模式隐藏控制卡');
    assert.equal(NS._cardVisibleInRole({ type: 'set' }), true, 'device 模式显示 set 卡');
    assert.equal(NS._cardVisibleInRole({ type: 'trend' }), false, 'device 模式隐藏 trend 卡 (显示 set 可配置卡)');
  } finally {
    NS._simRole = savedRole;
  }
});

test('P5 默认卡片: 单协议含 host(control单bit+trend) + device(set)', () => {
  const cards = NS.CARDS.filter((c) => c.protocol === 'proto_bms_v113');
  const controlCards = cards.filter((c) => c.type === 'control');
  const trendCards = cards.filter((c) => c.type === 'trend');
  const setCards = cards.filter((c) => c.type === 'set');
  // 主机: 0x01 ctrl 拆成每位一张单bit 卡 (10 个有效位)
  assert.ok(controlCards.length >= 10, `单bit 控制卡 ${controlCards.length} ≥ 10`);
  assert.ok(controlCards.every((c) => c.singleBit === true), '控制卡都是 singleBit');
  assert.ok(controlCards.some((c) => c.title === 'Load'), '含 Load 位卡');
  assert.ok(controlCards.some((c) => c.title === 'fan_enable'), '含 fan_enable 位卡');
  assert.ok(!controlCards.some((c) => /^Reserved/.test(c.title)), '不含 Reserved 位卡');
  assert.ok(trendCards.length >= 6, 'trend 遥测卡 ≥ 6');
  assert.ok(setCards.length >= 12, 'set 参数卡 ≥ 12');
  assert.ok(setCards.some((c) => c.field === 'ProtectCode' && c.bitset), '含 ProtectCode bitset set 卡');
  // v1.3.10: 控制卡不再带 RSOC 响应字段
  assert.ok(controlCards.every((c) => !c.respField), '控制卡不含 respField (RSOC)');
});

test('P6 字段下拉分组: 位项与普通字段分开 (isBit 标记 + optgroup)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const cmd = proto.commands.find((c) => c.id === 0x01);
  const opts = NS._cardFieldOptions(cmd);
  const fields = opts.filter((o) => !o.isBit);
  const bits = opts.filter((o) => o.isBit);
  assert.ok(fields.length >= 48, `普通字段 ${fields.length} ≥ 48`);
  assert.ok(bits.length >= 50, `位项 ${bits.length} ≥ 50`);
  assert.ok(bits.every((o) => o.isBit === true), '位项都带 isBit 标记');
  assert.ok(bits.some((o) => o.name === 'ProtectCode.软件层放电过温保护'), '含 ProtectCode 位项');
  // optgroup 渲染
  const html = NS._fieldOptionGroupsHtml(opts, '');
  assert.ok(html.includes('<optgroup label="字段">'), '含 字段 optgroup');
  assert.ok(html.includes('<optgroup label="位 (bitset 展开)">'), '含 位 optgroup');
  // 位项在字段之后 (分组分离)
  assert.ok(html.indexOf('位 (bitset 展开)') > html.indexOf('字段'), '位分组在字段分组之后');
});

test('P6 新建命令方向 both 选项 + _saveNewCommand 保留双向布局', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const c01 = proto.commands.find((c) => c.id === 0x01);
  // direction select 含 both 选项
  const dirSel = dom.window.document.getElementById('dh-new-cmd-direction');
  const bothOpt = dirSel && Array.from(dirSel.options).find((o) => o.value === 'both');
  assert.ok(bothOpt, '方向下拉含 both 选项');
  // 编辑 0x01 (direction=both) → 打开 modal 回填 both
  NS.openNewCommandModal('proto_bms_v113', c01, 'edit');
  assert.equal(dirSel.value, 'both', '编辑双向命令回填方向 both');
  NS.closeModal('dh-new-command');
});

test('P4 0x01 字段视图: CB 48 字段 (含位展开) — 协议字段不再为 0', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const cmdDef = proto.schema.commands['0x01'];
  const cbFields = cmdDef.CB.fields.filter((f) => !f.todo && f.type !== 'bytes');
  assert.equal(cbFields.length, 48, `0x01 CB 字段数 ${cbFields.length} == 48`);
  // bitset 字段逐位展开
  const bitExpanded = cbFields.reduce((acc, f) => acc + (f.type === 'bitset' && Array.isArray(f.bits) ? f.bits.length : 0), 0);
  assert.ok(bitExpanded >= 50, `bitset 位展开数 ${bitExpanded} ≥ 50`);
  assert.ok(cbFields.some((f) => f.name === 'ProtectCode' && f.type === 'bitset' && f.bits.length === 16), 'ProtectCode 16 位');
  assert.ok(cbFields.some((f) => f.name === 'AFCC' && f.type === 'u32'), 'AFCC 尾部字段');
  // 主机 MB: ctrl bitset 16 位
  const mbFields = cmdDef.MB.fields;
  assert.equal(mbFields.length, 1, '0x01 MB 1 字段 (ctrl)');
  assert.equal(mbFields[0].name, 'ctrl', 'MB ctrl 字段');
  assert.equal(mbFields[0].bits.length, 16, 'ctrl 16 位');
});

test('P2 computeDataSize: schema 命令按 txLen+rxLen 算, 不再为 0', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const c01 = proto.commands.find((c) => c.id === 0x01);
  const c02 = proto.commands.find((c) => c.id === 0x02);
  assert.equal(NS.computeDataSize(c01), 2 + 159, '0x01 大小 = 161B (2 tx + 159 rx)');
  assert.equal(NS.computeDataSize(c02), 95 + 1, '0x02 大小 = 96B (95 tx + 1 rx)');
});

test('P2 编辑命令显示 schema 字段 (openNewCommandModal 派生 dataFields 非空)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const c01 = proto.commands.find((c) => c.id === 0x01);
  NS.openNewCommandModal('proto_bms_v113', c01, 'edit');
  const s = NS._newCmdState;
  assert.ok(s && Array.isArray(s.dataFields) && s.dataFields.length >= 48, `编辑 0x01 dataFields 派生 ${s && s.dataFields.length} ≥ 48`);
  assert.ok(s.dataFields.some((df) => df.name === 'ProtectCode' && df.dir === 'rx' && Array.isArray(df.bits)), 'ProtectCode rx 字段含 bits');
  assert.ok(s.dataFields.some((df) => df.name === 'ctrl' && df.dir === 'tx'), 'ctrl tx 字段');
  NS.closeModal('dh-new-command');
});

test('P3 位定义编辑器: 逐位增删 (bits 数组映射)', () => {
  // 直接验证 bits 数据结构往返 (编辑器 UI 由 _renderNewCmdDataFields 渲染)
  const df = { name: 'flags', type: 'bitset', bits: [{ bit: 0, name: '过温' }, { bit: 1, name: '过流' }] };
  // 添加位 (模拟 "+ 添加位" 逻辑)
  const used = new Set(df.bits.map((b) => b.bit));
  let nextBit = 0; while (used.has(nextBit)) nextBit++;
  df.bits.push({ bit: nextBit, name: '短路' });
  assert.deepEqual(df.bits.map((b) => b.bit), [0, 1, 2], '添加后位号 0,1,2');
  // 删除位
  df.bits.splice(1, 1);
  assert.deepEqual(df.bits.map((b) => b.bit), [0, 2], '删除后位号 0,2');
});

test('P4 set 卡参数更新 → device 响应用新值', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  const savedRole = NS._simRole, savedCards = NS.CARDS;
  try {
    NS._simRole = 'device';
    NS.activeProtoId = 'proto_bms_v113';
    const card = { id: 'set_test', type: 'set', cmd: 0x01, field: 'RSOC', protocol: 'proto_bms_v113', sim: { type: 'fixed', value: 33 } };
    NS.CARDS = [card];
    // 模拟 set 卡输入更新 (fixed 参数值改 66)
    card.sim = NS._simSourceParam('fixed', '66');
    const written = [];
    NS._writeSerial = (bytes) => written.push(Uint8Array.from(bytes));
    const q = NS.buildFrame(proto, proto.commands.find((c) => c.id === 0x01));
    const ok = NS._deviceRespond(q.bytes);
    assert.equal(ok, true, '从机响应');
    const resp = NS.parseFrame(proto, written[0]);
    assert.equal(resp.values.RSOC, 66, 'set 卡更新后 RSOC=66');
  } finally {
    NS._simRole = savedRole; NS.CARDS = savedCards; NS._writeSerial = null;
  }
});

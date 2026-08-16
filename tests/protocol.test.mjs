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
});

// 页面自带 setInterval (时钟等), 测试完关闭 window 清定时器, 否则进程不退出
test.after(() => { if (dom) dom.window.close(); });

test('CRC-16/Modbus 黄金向量 (BMS 协议文档实算帧)', () => {
  for (const v of golden.crc16Modbus) {
    const got = NS.crc16Modbus(hexToBytes(v.inputHex));
    assert.equal(got, v.crc, `${v.note} → 期望 0x${v.crc.toString(16).toUpperCase()} 实得 0x${got.toString(16).toUpperCase()}`);
  }
});

test('golden 帧 CRC 自洽 (帧尾 2 字节 == CRC16-LE)', () => {
  for (const f of golden.frames) {
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

test('parseFrame 黄金向量 (bms_0x01/0x02/0x03, 含位域/缩放/枚举/ascii/数组)', () => {
  const proto = NS.PROTOCOLS.find((p) => p.id === 'proto_bms_v113');
  assert.ok(proto, 'proto_bms_v113 已注册 (schema 嵌入)');
  for (const f of golden.frames) {
    const bytes = hexToBytes(f.bytesHex);
    const parsed = NS.parseFrame(proto, bytes);
    assert.equal(parsed.ok, true, `${f.id} 解析成功`);
    assert.equal(parsed.cmd, parseInt(f.cmd, 16), `${f.id} cmd`);
    assert.equal(parsed.dir, f.dir, `${f.id} 方向 (帧头识别)`);
    assert.equal(parsed.crcOk, true, `${f.id} CRC 通过`);
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

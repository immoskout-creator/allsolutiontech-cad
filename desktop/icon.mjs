// Ikona e programit si PNG 256×256: katror me qoshe të rrumbullakëta në ngjyrën e programit dhe shkurtesa me të bardhë.
import { deflateSync } from 'node:zlib';

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
};

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function makeIcon(label, [r, g, b], size = 256) {
  const px = Buffer.alloc(size * size * 4);
  const radius = size * 0.18;
  const inset = size * 0.04;
  // katrori me qoshe të rrumbullakëta, me anë të lëmuara (4×4 mostra për piksel)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const fx = x + (sx + 0.5) / 4, fy = y + (sy + 0.5) / 4;
          const cx = Math.min(Math.max(fx, inset + radius), size - inset - radius);
          const cy = Math.min(Math.max(fy, inset + radius), size - inset - radius);
          if ((fx - cx) ** 2 + (fy - cy) ** 2 <= radius * radius) hit++;
        }
      const i = (y * size + x) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.round((hit / 16) * 255);
    }
  // shkronjat
  const cell = Math.floor((size * 0.78) / (label.length * 6 - 1));
  const w = cell * (label.length * 6 - 1), h = cell * 7;
  const ox = Math.round((size - w) / 2), oy = Math.round((size - h) / 2);
  [...label].forEach((ch, n) =>
    FONT[ch].forEach((row, ry) =>
      [...row].forEach((bit, rx) => {
        if (bit !== '1') return;
        for (let y = 0; y < cell; y++)
          for (let x = 0; x < cell; x++) {
            const i = ((oy + ry * cell + y) * size + ox + (n * 6 + rx) * cell + x) * 4;
            px[i] = px[i + 1] = px[i + 2] = 255;
          }
      }),
    ),
  );
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// A make.fun news-image-daily entry (Node 22, standard library only).
// The entry image is entry.png beside this file; the program copies it,
// byte for byte, to /output/entry.png. The run is deterministic and needs
// no network: two runs write the same bytes.
//
// The image is a newspaper front page for Thursday 26 November 2026:
// five stories from that day's world news, each with its own picture and
// a short headline — the Cairo tanker fire (31 killed), the Thanksgiving
// nor'easter that postponed the Macy's parade, the drone strike in Kuwait,
// the blast at a Bangkok refinery, and Spain's Hernandez de Cos chosen to
// lead the ECB. The date line is the biggest text on the page after the
// masthead, so the day it sums up is unmistakable.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The competition's gate, checked here so a bad image fails loudly instead
// of silently shipping an entry the judge never sees: a whole PNG or JPEG
// of at most 1 MiB (1048576 bytes) and at most 1024 by 1024 pixels.
const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;

const source = new URL('./entry.png', import.meta.url);
const bytes = readFileSync(source);
if (bytes.length > MAX_BYTES) {
  throw new Error(`entry.png is ${bytes.length} bytes, the gate allows ${MAX_BYTES}`);
}
if (bytes.length < 8) {
  throw new Error('entry.png is too small to be an image');
}

// A whole image: PNG starts with its 8-byte signature, JPEG with SOI.
const isPng = bytes.subarray(0, 8).equals(
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
);
const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
if (!isPng && !isJpeg) {
  throw new Error('entry.png is neither a PNG nor a JPEG');
}

// Pixel size, read from the header so the file never needs decoding:
// PNG width/height sit at bytes 16..24, JPEG size comes from its first
// Start Of Frame segment.
let width = 0;
let height = 0;
if (isPng) {
  width = bytes.readUInt32BE(16);
  height = bytes.readUInt32BE(20);
} else {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      height = bytes.readUInt16BE(offset + 5);
      width = bytes.readUInt16BE(offset + 7);
      break;
    }
    offset += 2 + length;
  }
}
if (width === 0 || height === 0) {
  throw new Error('could not read entry.png dimensions');
}
if (width > MAX_SIDE || height > MAX_SIDE) {
  throw new Error(`entry.png is ${width}x${height}, the gate allows ${MAX_SIDE}x${MAX_SIDE}`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
copyFileSync(source, join(outDir, 'entry.png'));
const written = statSync(join(outDir, 'entry.png')).size;
console.log(`wrote entry.png (${width}x${height}, ${written} bytes, ${isPng ? 'PNG' : 'JPEG'})`);

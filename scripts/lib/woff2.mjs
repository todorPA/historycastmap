/**
 * Which characters a WOFF2 font file can draw — enough of a WOFF2 reader to answer that.
 *
 * Exists for scripts/fonts.test.mjs. The fonts once shipped as `latin-ext` subsets only, which
 * hold č ć š ž đ but not a–z or 0–9, while fonts.css declared them as covering basic Latin. No
 * build step or validator noticed; browsers silently drew ordinary letters in the system font.
 * Reading the file's own character map is the only check that cannot be fooled by its name.
 *
 * WOFF2: a header, a table directory with variable-length fields, then one Brotli stream with
 * every table concatenated. `cmap` is never transformed, so after decompression it is a plain
 * OpenType cmap; formats 4 (BMP) and 12 (full range) are all webfonts use.
 */
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

// The known-tag table from the WOFF2 spec, indexed by the low six bits of a directory entry.
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

/** UIntBase128, the spec's variable-length integer. */
function readBase128(buf, cursor) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = buf[cursor.at++];
    value = (value << 7) | (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error('bad UIntBase128');
}

/** The code points a WOFF2 file maps to glyphs. */
export function codePointsOf(path) {
  const buf = readFileSync(path);
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${path} is not a WOFF2 file`);

  const numTables = buf.readUInt16BE(12);
  const compressedLength = buf.readUInt32BE(20);
  const cursor = { at: 48 }; // fixed header size
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[cursor.at++];
    const tag = (flags & 0x3f) === 0x3f ? buf.toString('latin1', cursor.at, (cursor.at += 4)) : KNOWN_TAGS[flags & 0x3f];
    const origLength = readBase128(buf, cursor);
    const transform = (flags >> 6) & 3;
    // glyf/loca are transformed unless the version is 3; every other table only when non-zero.
    const transformed = tag === 'glyf' || tag === 'loca' ? transform !== 3 : transform !== 0;
    tables.push({ tag, length: transformed ? readBase128(buf, cursor) : origLength });
  }

  const data = brotliDecompressSync(buf.subarray(cursor.at, cursor.at + compressedLength));
  let offset = 0;
  let cmap;
  for (const t of tables) {
    if (t.tag === 'cmap') cmap = data.subarray(offset, offset + t.length);
    offset += t.length;
  }
  if (!cmap) throw new Error(`${path} has no cmap table`);

  const points = new Set();
  const subtables = cmap.readUInt16BE(2);
  for (let i = 0; i < subtables; i++) {
    const at = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(at);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(at + 6);
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(at + 14 + s * 2);
        const start = cmap.readUInt16BE(at + 16 + segX2 + s * 2);
        for (let cp = start; cp <= end && cp !== 0xffff; cp++) points.add(cp);
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(at + 12);
      for (let g = 0; g < groups; g++) {
        const start = cmap.readUInt32BE(at + 16 + g * 12);
        const end = cmap.readUInt32BE(at + 20 + g * 12);
        for (let cp = start; cp <= end; cp++) points.add(cp);
      }
    }
  }
  return points;
}

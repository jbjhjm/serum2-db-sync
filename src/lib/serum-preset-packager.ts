/**
 * utility written by Charles Brébant, modified to not serialize JSON data to file but return it instead.
 * 
 * @fileoverview  Utilities for **packing** and **unpacking** Xfer Serum preset
 * (`*.SerumPreset`) files.
 *
 * The binary layout, reconstructed from the reference Python implementation, is:
 *
 * ```
 *  ┌───────────────┬────────────────────────────────────────────────────────┐
 *  │ Offset (hex)  │ Description                                           │
 *  ├───────────────┼────────────────────────────────────────────────────────┤
 *  │ 00            │ MAGIC = "XferJson\0"  (9 bytes, ASCII)                │
 *  │ 09            │ JSON length         (u32 LE)                          │
 *  │ 0D            │ Reserved            (u32 LE, always 0)                │
 *  │ 11            │ Metadata (UTF-8 JSON, `JSON length` bytes)            │
 *  │ …             │ CBOR length         (u32 LE)                          │
 *  │ …             │ Flags              (u32 LE, 2 ⇒ Zstandard compressed) │
 *  │ …             │ Data  (zstd-compressed CBOR, `CBOR length` bytes)     │
 *  └───────────────┴────────────────────────────────────────────────────────┘
 * ```
 *
 * All multi-byte integers are little-endian.  The helpers below abstract the
 * repeated 32-bit-LE conversions; the public API is exposed through the
 * {@link unpack} and {@link pack} functions.
 *
 * @author  (c) 2025 — Charles Brébant
 * @license MIT
 */

import { readFile, writeFile } from 'node:fs/promises'
import { encode as cborEncode, decode as cborDecode } from 'cbor2'
import { compress, decompress } from '@mongodb-js/zstd'
import type { SerumPresetObject } from './serum-preset-interface.js'

const MAGIC = Buffer.from('XferJson\0', 'ascii') // 9 bytes

function u32le(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset)
}

function u32leBuf(val: number): Buffer {
  const b = Buffer.allocUnsafe(4)
  b.writeUInt32LE(val, 0)
  return b
}

export namespace SerumPresetPackager {

	export async function unpack(srcPath: string): Promise<SerumPresetObject> {
		const buf = await readFile(srcPath)

		/* Validate magic header -------------------------------------------------- */
		if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) {
			throw new Error(srcPath+ ' is not a valid .SerumPreset file (magic mismatch)')
		}
		let off = MAGIC.length

		/* Extract metadata ------------------------------------------------------- */
		const jsonLen = u32le(buf, off)
		off += 8 // skip length  + reserved DWORD
		const meta = JSON.parse(buf.subarray(off, off + jsonLen).toString('utf8'))
		off += jsonLen

		/* Extract compressed CBOR payload --------------------------------------- */
		const cborLen = u32le(buf, off)
		off += 8 // skip length  + flags (ignored)

		const cborBuf = await decompress(buf.subarray(off))
		if (cborBuf.length !== cborLen) {
			throw new Error('Decompressed length mismatch')
		}

		const data = cborDecode(cborBuf)
		return { metadata: meta, data }
	}

	export async function pack(obj:SerumPresetObject): Promise<Buffer> {

		/* Serialise sections ----------------------------------------------------- */
		const mBuf = Buffer.from(JSON.stringify(obj.metadata), 'utf8')
		const cBuf = cborEncode(obj.data)
		const zBuf = await compress(Buffer.from(cBuf), 3) // level 3 ≈ Python impl.

		/* Build header ----------------------------------------------------------- */
		const header1 = Buffer.concat([u32leBuf(mBuf.length), u32leBuf(0)]) // reserved=0
		const header2 = Buffer.concat([u32leBuf(cBuf.length), u32leBuf(2)]) // flags=2(zstd)

		/* Stitch everything together and write ---------------------------------- */
		return Buffer.concat([MAGIC, header1, mBuf, header2, zBuf])
	}	

}

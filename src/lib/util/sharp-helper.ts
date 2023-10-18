import sharp from "sharp"

import { bufferToDataUrl } from "@/lib/util/image-helper"

export async function bufferToPngDataUrl(buffer: Buffer) {
  const outputBuf = await sharp(buffer).toFormat("png").toBuffer()
  return bufferToDataUrl("image/png", outputBuf)
}

import { ApiError } from "next/dist/server/api-utils"
import sharp from "sharp"

import { storageBucket } from "@/lib/db/firebase"
import {
  base64FileSize,
  dataUrlToBase64,
  maxFileSizeBytes,
  supportedExtensions,
} from "@/lib/util/image-helper"

// TODO move file storage to another service
export async function resizeAndUploadImage(
  dataUrl: string,
  dimensions: { width?: number; height?: number },
  path: string,
  pub: boolean,
): Promise<string> {
  const base64 = dataUrlToBase64(dataUrl)
  const buffer = Buffer.from(base64, "base64")
  const extension = dataUrl.substring("data:image/".length, dataUrl.indexOf(";base64"))
  if (!supportedExtensions.includes(extension))
    throw new ApiError(400, "File uploaded is not of type: " + supportedExtensions.join(", "))

  if (base64FileSize(base64) >= maxFileSizeBytes)
    throw new ApiError(500, "File uploaded is too large")

  const background =
    extension === "png" || extension === "webp"
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : { r: 0, g: 0, b: 0 }
  const resizedBuffer = await sharp(buffer)
    .resize({ ...dimensions, fit: "contain", background })
    .toFormat("webp")
    .toBuffer()
  const fullPath = `${path}.webp`
  return uploadWebpImage(resizedBuffer, fullPath, pub)
}

export async function deleteImage(path: string) {
  const file = storageBucket.file(path)
  await file.delete()
}

export async function uploadWebpImage(img: Buffer | string, path: string, pub: boolean) {
  const file = storageBucket.file(path)
  await file.save(img, { contentType: "image/webp" })
  if (pub) await file.makePublic()
  return path
}

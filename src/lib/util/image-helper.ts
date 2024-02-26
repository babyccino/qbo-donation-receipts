import { ApiError } from "next/dist/server/api-utils"
import sharp from "sharp"
import { storageBucket } from "../db/firebase"

export const supportedExtensions = ["jpg", "jpeg", "png", "webp", "gif"]
// 1mb = 2^20 bytes
export const maxFileSizeBytes = 100 * Math.pow(2, 10)

export function isJpegOrPngDataURL(str: string): boolean {
  if (!str.startsWith("data:image/")) return false
  if (supportedExtensions.every(ext => !str.startsWith(`data:image/${ext};base64,`))) {
    return false
  }
  const regex = /^data:image\/(jpeg|jpg|png|webp|gif);base64,([a-zA-Z0-9+/]*={0,2})$/
  return regex.test(str)
}
export const dataUrlToBase64 = (str: string) => str.slice(str.indexOf("base64,") + "base64,".length)

export const base64EncodeString = (str: string) => Buffer.from(str).toString("base64")
export const base64DataUrlEncodeFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
export const base64FileSize = (str: string) => str.length * (3 / 4) - (str.at(-2) === "=" ? 2 : 1)

export const bufferToDataUrl = (mimeType: string, buffer: Buffer) =>
  `data:${mimeType};base64,${buffer.toString("base64")}`

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

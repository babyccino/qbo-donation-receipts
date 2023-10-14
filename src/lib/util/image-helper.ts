export const supportedExtensions = ["jpg", "jpeg", "png", "webp"]
// 1mb = 2^20 bytes
export const maxFileSizeBytes = 100 * Math.pow(2, 10)

export function isJpegOrPngDataURL(str: string): boolean {
  if (supportedExtensions.some(ext => !str.startsWith(`data:image/${ext};base64,`))) {
    return false
  }
  const regex = /^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/]*={0,2})$/
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

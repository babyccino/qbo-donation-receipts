export const supportedExtensions = ["jpg", "jpeg", "png", "webp"] as const
export type supportedExtensions = (typeof supportedExtensions)[number]
export const imageIsSupported = (ext: string): ext is supportedExtensions =>
  supportedExtensions.includes(ext as any)

// 1mb = 2^20 bytes
export const maxFileSizeBytes = 100 * Math.pow(2, 10)

export function isJpegOrPngDataURL(str: string): boolean {
  if (!str.startsWith("data:image/jpeg;base64,") && !str.startsWith("data:image/png;base64,")) {
    return false
  }
  const regex = /^data:image\/(jpeg|png);base64,([a-zA-Z0-9+/]*={0,2})$/
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

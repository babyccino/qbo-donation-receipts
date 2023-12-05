import sharp from "sharp"

import { Bucket } from "@/lib/db/firebase"
import { config } from "@/lib/util/config"
import { bufferToDataUrl, dataUrlToBase64 } from "@/lib/util/image-helper"
import { DoneeInfo } from "db/schema"

const { firebaseProjectId, firebaseStorageEmulatorHost } = config

export type RemoveTimestamps<T extends { createdAt: Date; updatedAt: Date }> = Omit<
  T,
  "createdAt" | "updatedAt"
>

export function removeTimestamps<T extends { createdAt: Date; updatedAt: Date }>(
  obj: T,
): RemoveTimestamps<T> {
  // @ts-ignore
  delete obj.createdAt
  // @ts-ignore
  delete obj.updatedAt
  return obj
}

export async function downloadImageAsDataUrl(storageBucket: Bucket, firestorePath: string) {
  const file = await storageBucket.file(firestorePath).download()
  const fileString = file[0].toString("base64")
  const match = firestorePath.match(/[^.]+$/)
  if (!match) throw new Error("")
  const extension = match[0]
  return `data:image/${extension};base64,${fileString}`
}

export function getImageUrl(path: string) {
  if (firebaseStorageEmulatorHost)
    return `http://${firebaseStorageEmulatorHost}/${firebaseProjectId}.appspot.com/${path}`
  return `https://storage.googleapis.com/${firebaseProjectId}.appspot.com/${path}`
}

export async function downloadImagesForDonee<T extends Pick<DoneeInfo, "signature" | "smallLogo">>(
  donee: T,
  storageBucket: Bucket,
): Promise<T> {
  const [signatureDataUrl, smallLogoDataUrl] = await Promise.all([
    downloadImageAsDataUrl(storageBucket, donee.signature),
    downloadImageAsDataUrl(storageBucket, donee.smallLogo),
  ])

  return {
    ...donee,
    signature: signatureDataUrl,
    smallLogo: smallLogoDataUrl,
  }
}

export async function downloadImageAsBuffer(storageBucket: Bucket, firestorePath: string) {
  const dataUrl = await downloadImageAsDataUrl(storageBucket, firestorePath)
  const b64 = dataUrlToBase64(dataUrl)
  return Buffer.from(b64, "base64")
}

export async function bufferToPngDataUrl(buffer: Buffer) {
  const outputBuf = await sharp(buffer).toFormat("png").toBuffer()
  return bufferToDataUrl("iamge/png", outputBuf)
}

export async function downloadImageAndConvertToPng(storageBucket: Bucket, firestorePath: string) {
  const inputBuf = await downloadImageAsBuffer(storageBucket, firestorePath)
  return bufferToPngDataUrl(inputBuf)
}

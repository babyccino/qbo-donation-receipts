import { Timestamp } from "@google-cloud/firestore"
import sharp from "sharp"

import { config } from "@/lib/util/config"
import { Bucket } from "@/lib/db"
import { bufferToDataUrl, dataUrlToBase64 } from "@/lib/util/image-helper"
import type { DoneeInfo } from "db/schema"

const { firebaseProjectId, firebaseStorageEmulatorHost } = config

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

type TimestampToDate<T> = T extends Timestamp
  ? Date
  : T extends object
  ? {
      [K in keyof T]: TimestampToDate<T[K]>
    }
  : T
export function timestampToDate<T>(obj: T): TimestampToDate<T> {
  if (typeof obj !== "object") return obj as TimestampToDate<T>

  if (obj instanceof Timestamp) return obj.toDate() as TimestampToDate<T>

  if (Array.isArray(obj)) return obj.map(val => timestampToDate(val)) as TimestampToDate<T>

  for (const key in obj) {
    obj[key] = timestampToDate(obj[key]) as any
  }
  return obj as TimestampToDate<T>
}

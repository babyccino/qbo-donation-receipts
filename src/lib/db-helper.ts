import { Timestamp } from "@google-cloud/firestore"
import type { Bucket } from "@google-cloud/storage"

import { storageBucket } from "@/lib/db"
import { config } from "@/lib/util/config"
import {
  base64FileSize,
  dataUrlToBase64,
  imageIsSupported,
  maxFileSizeBytes,
  supportedExtensions,
} from "@/lib/util/image-helper"
import { DoneeInfo, User } from "@/types/db"
import { ApiError } from "next/dist/server/api-utils"
import sharp from "sharp"
const { firebaseProjectId, firebaseStorageEmulatorHost } = config

export async function getImageAsDataUrl(storageBucket: Bucket, url: string) {
  const file = await storageBucket.file(url).download()
  const fileString = file[0].toString("base64")
  const match = url.match(/[^.]+$/)
  if (!match) throw new Error("")
  const extension = match[0]
  return `data:image/${extension};base64,${fileString}`
}

export function getImageUrl(path: string) {
  if (firebaseStorageEmulatorHost)
    return `http://${firebaseStorageEmulatorHost}/${firebaseProjectId}.appspot.com/${path}`
  return `https://storage.googleapis.com/${firebaseProjectId}.appspot.com/${path}`
}

export async function downloadImagesForDonee(
  donee: Required<DoneeInfo>,
  storageBucket: Bucket,
): Promise<Required<DoneeInfo>> {
  const [signatureDataUrl, smallLogoDataUrl] = await Promise.all([
    getImageAsDataUrl(storageBucket, donee.signature),
    getImageAsDataUrl(storageBucket, donee.smallLogo),
  ])

  return {
    ...donee,
    signature: signatureDataUrl,
    smallLogo: smallLogoDataUrl,
  }
}

export type UserDataComplete = User & {
  items: Required<User>["items"]
  donee: Required<DoneeInfo>
  dateRange: Required<User>["dateRange"]
}
export function isUserDataComplete(user: User): user is UserDataComplete {
  const { items, donee, dateRange } = user
  if (!donee) return false

  return Boolean(
    items &&
      dateRange &&
      donee.companyAddress &&
      donee.companyName &&
      donee.country &&
      donee.registrationNumber &&
      donee.signatoryName &&
      donee.signature &&
      donee.smallLogo,
  )
}
export function checkUserDataCompletion({ items, donee, dateRange }: User): {
  items: boolean
  doneeDetails: boolean
} {
  const itemsComplete = Boolean(items && dateRange)
  if (!donee) return { items: itemsComplete, doneeDetails: false }

  return {
    items: itemsComplete,
    doneeDetails: Boolean(
      donee.companyAddress &&
        donee.companyName &&
        donee.country &&
        donee.registrationNumber &&
        donee.signatoryName &&
        donee.signature &&
        donee.smallLogo,
    ),
  }
}

export type TimestampToDate<T> = T extends Timestamp
  ? Date
  : T extends object
  ? {
      [K in keyof T]: TimestampToDate<T[K]>
    }
  : T
// firestore converts dates to its own timestamp type
export type DateToTimestamp<T> = T extends Date
  ? Timestamp
  : T extends object
  ? {
      [K in keyof T]: DateToTimestamp<T[K]>
    }
  : T

export function timestampToDate<T>(obj: T): TimestampToDate<T> {
  if (typeof obj !== "object") return obj as TimestampToDate<T>
  if (obj === null) return obj as TimestampToDate<T>

  if ("toDate" in obj && typeof obj.toDate === "function") return obj.toDate() as TimestampToDate<T>

  if (Array.isArray(obj)) return obj.map(val => timestampToDate(val)) as TimestampToDate<T>

  for (const key in obj) {
    obj[key] = timestampToDate(obj[key]) as any
  }
  return obj as TimestampToDate<T>
}
export async function resizeAndUploadImage(
  dataUrl: string,
  dimensions: { width?: number; height?: number },
  path: string,
  pub: boolean,
): Promise<string> {
  const base64 = dataUrlToBase64(dataUrl)
  const buffer = Buffer.from(base64, "base64")
  const extension = dataUrl.substring("data:image/".length, dataUrl.indexOf(";base64"))
  if (!imageIsSupported(extension))
    throw new ApiError(400, "File uploaded is not of type: " + supportedExtensions.join(", "))

  if (base64FileSize(base64) >= maxFileSizeBytes)
    throw new ApiError(500, "File uploaded is too large")

  const background = extension === "png" ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 0, g: 0, b: 0 }
  const resizedBuffer = await sharp(buffer)
    .resize({ ...dimensions, fit: "contain", background })
    .toFormat("webp")
    .toBuffer()
  const fullPath = `${path}.webp`
  const file = storageBucket.file(fullPath)
  await file.save(resizedBuffer, { contentType: "image/webp" })
  if (pub) await file.makePublic()
  return fullPath
}

export async function resizeAndUploadArrayBuffer(
  buf: ArrayBuffer,
  dimensions: { width?: number; height?: number },
  path: string,
  pub: boolean,
): Promise<string> {
  const resizedBuffer = await sharp(buf)
    .resize({ ...dimensions, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat("webp")
    .toBuffer()
  const fullPath = `${path}.webp`
  const file = storageBucket.file(fullPath)
  await file.save(resizedBuffer, { contentType: "image/webp" })
  if (pub) await file.makePublic()
  return fullPath
}

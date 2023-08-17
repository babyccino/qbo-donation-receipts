import type { Bucket } from "@google-cloud/storage"
import { Timestamp } from "@google-cloud/firestore"

import { DoneeInfo, User } from "@/types/db"
import { config } from "@/lib/util/config"
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
  storageBucket: Bucket
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
  date: Required<User>["date"]
}
export function isUserDataComplete(user: User): user is UserDataComplete {
  const { items, donee, date } = user
  if (!donee) return false

  return Boolean(
    items &&
      date &&
      donee.companyAddress &&
      donee.companyName &&
      donee.country &&
      donee.registrationNumber &&
      donee.signatoryName &&
      donee.signature &&
      donee.smallLogo
  )
}
export function checkUserDataCompletion({ items, donee, date }: User): {
  items: boolean
  doneeDetails: boolean
} {
  const itemsComplete = Boolean(items && date)
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
        donee.smallLogo
    ),
  }
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

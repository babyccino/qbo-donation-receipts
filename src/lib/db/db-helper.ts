import { Timestamp } from "@google-cloud/firestore"

import { DoneeInfo, FileStorage, User } from "@/types/db"
import { config } from "@/lib/util/config"

const { firebaseProjectId, firebaseStorageEmulatorHost } = config

export function getImageUrl(path: string) {
  if (firebaseStorageEmulatorHost)
    return `http://${firebaseStorageEmulatorHost}/${firebaseProjectId}.appspot.com/${path}`
  return `https://storage.googleapis.com/${firebaseProjectId}.appspot.com/${path}`
}

export async function downloadImagesForDonee(
  id: string,
  donee: Required<DoneeInfo>,
  fileStorage: FileStorage,
): Promise<Required<DoneeInfo>> {
  const [signatureDataUrl, smallLogoDataUrl] = await Promise.all([
    fileStorage.downloadFileBase64DataUrl(id, donee.signature),
    fileStorage.downloadFileBase64DataUrl(id, donee.smallLogo),
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
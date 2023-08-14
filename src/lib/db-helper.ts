import { storageBucket } from "@/lib/db"
import { DoneeInfo, User } from "@/types/db"

export async function getImageAsDataUrl(url: string) {
  const file = await storageBucket.file(url).download()
  const fileString = file[0].toString("base64")
  const match = url.match(/[^.]+$/)
  if (!match) throw new Error("")
  const extension = match[0]
  return `data:image/${extension};base64,${fileString}`
}

export async function downloadImagesForDonee(
  donee: Required<DoneeInfo>
): Promise<Required<DoneeInfo>> {
  const [signatureDataUrl, smallLogoDataUrl] = await Promise.all([
    getImageAsDataUrl(donee.signature),
    getImageAsDataUrl(donee.smallLogo),
  ])

  return {
    ...donee,
    signature: signatureDataUrl,
    smallLogo: smallLogoDataUrl,
  }
}

type UserDataComplete = User & {
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
  if (!donee) return {items: itemsComplete, doneeDetails: false}

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

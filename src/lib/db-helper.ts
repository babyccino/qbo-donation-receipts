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

export function receiptReady(user: User): user is User & {
  items: Required<User>["items"]
  donee: Required<DoneeInfo>
  date: Required<User>["date"]
} {
  const { items, donee, date } = user
  const {
    companyAddress,
    companyName,
    country,
    registrationNumber,
    signatoryName,
    signature,
    smallLogo,
  } = donee || {}

  return Boolean(
    items &&
      date &&
      companyAddress &&
      companyName &&
      country &&
      registrationNumber &&
      signatoryName &&
      signature &&
      smallLogo
  )
}
export function alreadyFilledIn(user: User | undefined): {
  items: boolean
  doneeDetails: boolean
} {
  if (!user) return { items: false, doneeDetails: false }

  const { items, donee, date } = user
  const {
    companyAddress,
    companyName,
    country,
    registrationNumber,
    signatoryName,
    signature,
    smallLogo,
  } = donee || {}

  return {
    items: Boolean(items && date),
    doneeDetails: Boolean(
      companyAddress &&
        companyName &&
        country &&
        registrationNumber &&
        signatoryName &&
        signature &&
        smallLogo
    ),
  }
}

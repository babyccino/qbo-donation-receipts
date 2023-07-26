import { storageBucket } from "@/lib/db"
import { DoneeInfo } from "@/types/db"

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

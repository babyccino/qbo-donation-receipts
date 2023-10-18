import { redirect } from "next/navigation"

import { getServerSessionOrThrow } from "@/app/auth-util"
import { ImageInput } from "@/components/form-client"
import { Fieldset, Legend, TextInput } from "@/components/form-server"
import { buttonStyling } from "@/components/link"
import { user as dbUser, getUserData } from "@/lib/db"
import { checkUserDataCompletion, resizeAndUploadArrayBuffer } from "@/lib/db-helper"
import { imageIsSupported } from "@/lib/util/image-helper"

const imageHelper = "PNG, JPG or GIF (max 100kb)."
const imageNotRequiredHelper = (
  <>
    <p className="mb-2">{imageHelper}</p>
    <p>Choose an image if you wish to replace your saved image</p>
  </>
)

function isFileSupported(file: File) {
  if (!file.size) return false
  if (!file.name) return false
  const ext = file.name.split(".").pop()
  if (!ext) return false
  return !imageIsSupported(ext)
}

export default async function Details() {
  const session = await getServerSessionOrThrow()

  const user = await getUserData(session.user.id)
  const { donee } = user
  const filledIn = checkUserDataCompletion(user)
  const itemsFilledIn = filledIn.items

  async function formAction(formData: FormData) {
    "use server"

    const signature = formData.get("signature") as File
    const smallLogo = formData.get("smallLogo") as File

    const id = session!.user.id

    const [signatureUrl, smallLogoUrl] = await Promise.all([
      isFileSupported(signature)
        ? resizeAndUploadArrayBuffer(
            await signature.arrayBuffer(),
            { height: 150 },
            `${id}/signature`,
            false,
          )
        : undefined,
      isFileSupported(smallLogo)
        ? resizeAndUploadArrayBuffer(
            await smallLogo.arrayBuffer(),
            { height: 100, width: 100 },
            `${id}/smallLogo`,
            true,
          )
        : undefined,
    ])

    const data = {
      companyName: formData.get("companyName") as string,
      companyAddress: formData.get("companyAddress") as string,
      country: formData.get("country") as string,
      registrationNumber: formData.get("registrationNumber") as string,
      signatoryName: formData.get("signatoryName") as string,
      signatureUrl,
      smallLogoUrl,
    }

    await dbUser.doc(id).set({ donee: data }, { merge: true })

    const destination = itemsFilledIn ? "/generate-receipts" : "/items"
    redirect(destination)
  }

  return (
    <form action={formAction} className="w-full max-w-2xl space-y-4 p-4">
      <Fieldset className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <Legend className="sm:col-span-2">Organisation</Legend>
        <TextInput
          id="companyAddress"
          minLength={10}
          defaultValue={donee?.companyAddress}
          label="Address"
          className="sm:col-span-2"
          required
        />
        <TextInput id="companyName" defaultValue={donee?.companyName} label="Legal name" required />
        <TextInput
          id="country"
          minLength={2}
          defaultValue={donee?.country}
          label="Country"
          required
        />
        <TextInput
          id="registrationNumber"
          minLength={15}
          defaultValue={donee?.registrationNumber}
          label="Charity registration number"
          required
        />
        <TextInput
          id="signatoryName"
          minLength={5}
          label="Signatory's name"
          defaultValue={donee?.signatoryName}
          required
        />
        <ImageInput
          id="signature"
          label="Image of signatory's signature"
          maxSize={102400}
          helper={donee?.signatoryName ? imageNotRequiredHelper : imageHelper}
          required={!Boolean(donee?.signatoryName)}
        />
        <ImageInput
          id="smallLogo"
          label="Small image of organisation's logo"
          maxSize={102400}
          helper={donee?.smallLogo ? imageNotRequiredHelper : imageHelper}
          required={!Boolean(donee?.smallLogo)}
        />
        <div className="flex flex-row items-center justify-center sm:col-span-2">
          <input
            className={buttonStyling + " text-l"}
            type="submit"
            value={filledIn.items ? "Generate Receipts" : "Select Qualifying Items"}
          />
        </div>
      </Fieldset>
    </form>
  )
}

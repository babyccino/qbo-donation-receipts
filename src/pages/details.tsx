import { GetServerSideProps } from "next"
import { Session } from "next-auth"
import { useRouter } from "next/router"
import { FormEventHandler, useRef } from "react"

import { Fieldset, ImageInput, Legend, TextInput } from "@/components/form"
import { getUserData } from "@/lib/db"
import { checkUserDataCompletion } from "@/lib/db-helper"
import { base64DataUrlEncodeFile } from "@/lib/util/image-helper"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { disconnectedRedirect, getServerSessionOrThrow } from "@/lib/util/next-auth-helper-server"
import { postJsonData } from "@/lib/util/request"
import { DataType as DetailsApiDataType } from "@/pages/api/details"
import { DoneeInfo } from "@/types/db"
import { buttonStyling } from "@/components/link"

const imageHelper = "PNG, JPG or GIF (max 100kb)."
const imageNotRequiredHelper = (
  <>
    <p className="mb-2">{imageHelper}</p>
    <p>Choose an image if you wish to replace your saved image</p>
  </>
)

type Props = {
  doneeInfo: DoneeInfo
  session: Session
  itemsFilledIn: boolean
}

export default function Details({ doneeInfo, itemsFilledIn }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  async function getFormData() {
    if (!formRef.current) throw new Error("Form html element has not yet been initialised")

    const formData = new FormData(formRef.current)

    const signature = formData.get("signature") as File
    const smallLogo = formData.get("smallLogo") as File

    return {
      companyName: formData.get("companyName") as string,
      companyAddress: formData.get("companyAddress") as string,
      country: formData.get("country") as string,
      registrationNumber: formData.get("registrationNumber") as string,
      signatoryName: formData.get("signatoryName") as string,
      signature: signature.name !== "" ? await base64DataUrlEncodeFile(signature) : undefined,
      smallLogo: smallLogo.name !== "" ? await base64DataUrlEncodeFile(smallLogo) : undefined,
    }
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()

    const formData: DetailsApiDataType = await getFormData()
    await postJsonData("/api/details", formData)

    const destination = itemsFilledIn ? "/generate-receipts" : "/items"
    router.push({
      pathname: destination,
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-2xl space-y-4 p-4">
      <Fieldset className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <Legend className="sm:col-span-2">Organisation</Legend>
        <TextInput
          id="companyAddress"
          minLength={10}
          defaultValue={doneeInfo.companyAddress}
          label="Address"
          className="sm:col-span-2"
          required
        />
        <TextInput
          id="companyName"
          defaultValue={doneeInfo.companyName}
          label="Legal name"
          required
        />
        <TextInput
          id="country"
          minLength={2}
          defaultValue={doneeInfo.country}
          label="Country"
          required
        />
        <TextInput
          id="registrationNumber"
          minLength={15}
          defaultValue={doneeInfo.registrationNumber}
          label="Charity registration number"
          required
        />
        <TextInput
          id="signatoryName"
          minLength={5}
          label="Signatory's name"
          defaultValue={doneeInfo.signatoryName}
          required
        />
        <ImageInput
          id="signature"
          label="Image of signatory's signature"
          maxSize={102400}
          helper={doneeInfo.signatoryName ? imageNotRequiredHelper : imageHelper}
          required={!Boolean(doneeInfo.signatoryName)}
        />
        <ImageInput
          id="smallLogo"
          label="Small image of organisation's logo"
          maxSize={102400}
          helper={doneeInfo.smallLogo ? imageNotRequiredHelper : imageHelper}
          required={!Boolean(doneeInfo.smallLogo)}
        />
        <div className="flex flex-row items-center justify-center sm:col-span-2">
          <input
            className={buttonStyling + " text-l"}
            type="submit"
            value={itemsFilledIn ? "Generate Receipts" : "Select Qualifying Items"}
          />
        </div>
      </Fieldset>
    </form>
  )
}

// --- server-side props --- //

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSessionOrThrow(req, res)
  assertSessionIsQboConnected(session)

  const user = await getUserData(session.user.id)
  if (!user.donee) return disconnectedRedirect

  return {
    props: {
      session,
      doneeInfo: user.donee,
      itemsFilledIn: checkUserDataCompletion(user).items,
    },
  }
}

import { FormEventHandler, useRef } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { Session, getServerSession } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"
import { buttonStyling } from "@/components/ui"
import { user } from "@/lib/db"
import { alreadyFilledIn } from "@/lib/app-api"
import { base64EncodeFile, postJsonData } from "@/lib/util/request"
import { DataType as DetailsApiDataType } from "@/pages/api/details"
import { DoneeInfo } from "@/types/db"
import { Fieldset, ImageInput, Legend, TextInput } from "@/components/form"

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

    const companyName = formData.get("companyName") as string
    const companyAddress = formData.get("companyAddress") as string
    const country = formData.get("country") as string
    const registrationNumber = formData.get("registrationNumber") as string
    const signatoryName = formData.get("signatoryName") as string
    const signature = formData.get("signature") as File
    const smallLogo = formData.get("smallLogo") as File

    return {
      companyName,
      companyAddress,
      country,
      registrationNumber,
      signatoryName,
      signature: signature.name !== "" ? await base64EncodeFile(signature) : undefined,
      smallLogo: smallLogo.name !== "" ? await base64EncodeFile(smallLogo) : undefined,
    }
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()

    const formData: DetailsApiDataType = await getFormData()
    const apiResponse = await postJsonData("/api/details", formData)

    if (itemsFilledIn)
      router.push({
        pathname: "generate-receipts",
      })
    else
      router.push({
        pathname: "services",
        query: { details: true },
      })
  }

  const imageHelper = "PNG, JPG or GIF (MAX. 800x400px)."
  const imageNotRequiredHelper = (
    <>
      <p className="mb-2">{imageHelper}</p>
      <p>Choose an image if you wish to replace your saved image</p>
    </>
  )

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
          helper={doneeInfo.signatoryName ? imageNotRequiredHelper : imageHelper}
          required={!Boolean(doneeInfo.signatoryName)}
        />
        <ImageInput
          id="smallLogo"
          label="Small image of organisation's logo"
          helper={doneeInfo.smallLogo ? imageNotRequiredHelper : imageHelper}
          required={!Boolean(doneeInfo.smallLogo)}
        />
        <input
          className={buttonStyling + " text-l mr-auto block cursor-pointer"}
          type="submit"
          value={itemsFilledIn ? "Generate Receipts" : "Select Qualifying Items"}
        />
      </Fieldset>
    </form>
  )
}

// --- server-side props --- //

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) throw new Error("Couldn't find session")

  const doc = await user.doc(session.user.id).get()
  const dbUser = doc.data()
  if (!dbUser) throw new Error("User has no corresponding db entry")

  const itemsFilledIn = Boolean(context.query.items) || alreadyFilledIn(dbUser).items

  // if donee data is already in db use that to prefill form otherwise use data from quickbooks
  return {
    props: {
      session,
      doneeInfo: dbUser.donee,
      itemsFilledIn,
    },
  }
}

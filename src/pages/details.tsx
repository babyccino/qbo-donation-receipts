import { FormEventHandler, useRef } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { Session, getServerSession } from "next-auth"

import { getCompanyInfo } from "@/lib/qbo-api"
import { authOptions } from "./api/auth/[...nextauth]"
import { Form, buttonStyling } from "@/components/ui"
import { user } from "@/lib/db"
import { DoneeInfo } from "@/components/receipt"
import { alreadyFilledIn, postJsonData, base64EncodeFile } from "@/lib/parse"

// const DEBOUNCE = 500

type Props = {
  doneeInfo: Partial<DoneeInfo>
  session: Session
  itemsFilledIn: boolean
}

export default function Services({ doneeInfo, itemsFilledIn }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  // TODO save user's selected items in db
  // const debounceRef = useRef<number>(-1)
  // const sendFormData = () => {
  //   if (!formRef.current) throw new Error()

  //   const formData = new FormData(formRef.current)
  //   const selectedItems = new Set(formData.keys())
  //   console.log(selectedItems)
  // }

  // const debounce = () => {
  //   clearTimeout(debounceRef.current)
  //   debounceRef.current = setTimeout(sendFormData, DEBOUNCE) as any
  // }

  async function getFormData() {
    if (!formRef.current) throw new Error()

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
      signature: await base64EncodeFile(signature),
      smallLogo: await base64EncodeFile(smallLogo),
    }
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()

    const formData = await getFormData()
    const apiResponse = postJsonData("/api/details", formData)

    if (itemsFilledIn)
      router.push({
        pathname: "generate-receipts",
        query: { ...formData, signature: true, smallLogo: true },
      })
    else
      router.push({
        pathname: "services",
        query: { details: true },
      })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-lg space-y-4 m-auto">
      <Form.Fieldset>
        <Form.Legend>Organisation</Form.Legend>
        <Form.TextInput id="companyName" defaultValue={doneeInfo.companyName} label="Legal name" />
        <Form.TextInput
          id="companyAddress"
          minLength={10}
          defaultValue={doneeInfo.companyAddress}
          label="Address"
        />
        <Form.TextInput
          id="country"
          minLength={2}
          defaultValue={doneeInfo.country}
          label="Country"
        />
        <Form.TextInput
          id="registrationNumber"
          minLength={15}
          defaultValue={doneeInfo.registrationNumber}
          label="Charity registration number"
        />
        <Form.TextInput
          id="signatoryName"
          minLength={5}
          label="Signatory's name"
          defaultValue={doneeInfo.signatoryName}
        />
        <Form.ImageInput
          id="signature"
          label="Image of signatory's signature"
          helper="PNG, JPG or GIF (MAX. 800x400px)."
          required
        />
        <Form.ImageInput
          id="smallLogo"
          label="Small image of organisation's logo"
          helper="PNG, JPG or GIF (MAX. 800x400px)."
          required
        />
      </Form.Fieldset>
      <input
        className={buttonStyling + " cursor-pointer block mx-auto text-l"}
        type="submit"
        value={itemsFilledIn ? "Generate Receipts" : "Select Qualifying Items"}
      />
    </form>
  )
}

// --- server-side props --- //

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session = await getServerSession(context.req, context.res, authOptions)
  if (!session) throw new Error("Couldn't find session")

  const qboCompanyInfo = getCompanyInfo(session)
  const doc = await user.doc(session.user.id).get()
  const dbUserData = doc.data()

  const itemsFilledIn = Boolean(context.query.items) || alreadyFilledIn(doc).items

  // if donee data is already in db use that to prefill form otherwise use data from quickbooks
  return {
    props: {
      session,
      doneeInfo: dbUserData?.donee || (await qboCompanyInfo),
      itemsFilledIn,
    },
  }
}

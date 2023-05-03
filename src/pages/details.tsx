import { FormEventHandler, useRef } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { getServerSession } from "next-auth"

import { getCompanyInfo } from "@/lib/qbo-api"
import { Session } from "@/lib/util"
import { authOptions } from "./api/auth/[...nextauth]"
import { Form, buttonStyling } from "@/components/ui"
import { user } from "@/lib/db"
import { DoneeInfo } from "@/components/receipt"

// const DEBOUNCE = 500

type Props = {
  doneeInfo: Partial<DoneeInfo>
  session: Session
}

export default function Services({ doneeInfo }: Props) {
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

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    if (!formRef.current) throw new Error()
    event.preventDefault()

    const formData = new FormData(formRef.current)

    const companyName = formData.get("companyName") as string
    const companyAddress = formData.get("companyAddress") as string
    const country = formData.get("country") as string
    const registrationNumber = formData.get("registrationNumber") as string
    const signatoryName = formData.get("signatoryName") as string
    const signature = formData.get("signature") as string
    const smallLogo = formData.get("smallLogo") as string

    const query = {
      // companyName: companyName !== companyInfo.name ? companyName : undefined,
      // address: address !== companyInfo.address ? address : undefined,
      // country: country !== companyInfo.country ? country : undefined,
      companyName,
      companyAddress,
      country,
      registrationNumber,
      signatoryName,
      signature,
      smallLogo,
    }

    const response = fetch("/api/details", {
      method: "POST",
      body: JSON.stringify(query),
    })

    router.push({
      pathname: "generate-receipts",
      query,
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
        <Form.TextInput
          id="signature"
          label="Image of signatory's signature"
          defaultValue={doneeInfo.signature}
        />
        <Form.TextInput
          id="smallLogo"
          label="Small image of organisation's logo"
          defaultValue={doneeInfo.smallLogo}
        />
      </Form.Fieldset>
      <input
        className={buttonStyling + " cursor-pointer block mx-auto text-l"}
        type="submit"
        value="Generate Receipts"
      />
    </form>
  )
}

// --- server-side props ---\

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const qboCompanyInfo = getCompanyInfo(session)
  const dbUser = await user.doc(session.user.id).get()
  const dbUserData = dbUser.data()

  // if donee data is already in db use that to prefill form otherwise use get some data from quickbooks
  return {
    props: {
      session,
      doneeInfo: dbUserData?.donee || (await qboCompanyInfo),
    },
  }
}

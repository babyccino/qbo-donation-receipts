import { and, desc, eq, isNotNull } from "drizzle-orm"
import { Label, TextInput } from "flowbite-react"
import { GetServerSideProps } from "next"
import { ApiError } from "next/dist/server/api-utils"
import { useRouter } from "next/router"
import { FormEventHandler, useRef } from "react"

import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { Session, getServerSession } from "next-auth"

import { Fieldset, ImageInput, Legend } from "@/components/form"
import { LayoutProps } from "@/components/layout"
import { buttonStyling } from "@/components/link"
import { disconnectedRedirect, signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { RemoveTimestamps } from "@/lib/db/db-helper"
import { refreshTokenIfNeeded } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { getCompanyInfo } from "@/lib/qbo-api"
import { charityRegistrationNumberRegex, htmlRegularCharactersRegex } from "@/lib/util/etc"
import { base64DataUrlEncodeFile } from "@/lib/util/image-helper"
import { postJsonData } from "@/lib/util/request"
import { DataType as DetailsApiDataType } from "@/pages/api/details"
import { DoneeInfo, accounts, sessions } from "db/schema"

const imageHelper = "PNG, JPG or GIF (max 100kb)."
const imageNotRequiredHelper = (
  <>
    <p className="mb-2">{imageHelper}</p>
    <p>Choose an image if you wish to replace your saved image</p>
  </>
)

type PDoneeInfo = Partial<Omit<RemoveTimestamps<DoneeInfo>, "id" | "userId">>

type Props = {
  doneeInfo: PDoneeInfo
  session: Session
  itemsFilledIn: boolean
  realmId: string
} & LayoutProps

export default function Details({ doneeInfo, itemsFilledIn, realmId }: Props) {
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

    const formData = await getFormData()
    await postJsonData("/api/details", formData satisfies DetailsApiDataType)

    const destination = itemsFilledIn ? "/generate-receipts" : "/items"
    await router.push({
      pathname: destination,
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-2xl space-y-4 p-4">
      <Fieldset className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        <Legend className="sm:col-span-2">Organisation</Legend>
        <p className="sm:col-span-2">
          <Label className="mb-2 inline-block" htmlFor="companyAddress">
            Address
          </Label>
          <TextInput
            name="companyAddress"
            id="companyAddress"
            minLength={10}
            defaultValue={doneeInfo.companyAddress}
            required
            title="alphanumeric as well as '-', '_', ','"
            pattern={htmlRegularCharactersRegex}
          />
        </p>
        <p>
          <Label className="mb-2 inline-block" htmlFor="companyName">
            Legal name
          </Label>
          <TextInput
            id="companyName"
            name="companyName"
            defaultValue={doneeInfo.companyName}
            required
            title="alphanumeric as well as '-', '_', ','"
            pattern={htmlRegularCharactersRegex}
          />
        </p>
        <p>
          <Label className="mb-2 inline-block" htmlFor="country">
            Country
          </Label>
          <TextInput
            name="country"
            id="country"
            minLength={2}
            defaultValue={doneeInfo.country}
            required
            title="alphanumeric as well as '-', '_', ','"
            pattern={htmlRegularCharactersRegex}
          />
        </p>
        <p>
          <Label className="mb-2 inline-block" htmlFor="registrationNumber">
            Charity registration number
          </Label>
          <TextInput
            name="registrationNumber"
            id="registrationNumber"
            minLength={15}
            defaultValue={doneeInfo.registrationNumber ?? undefined}
            required
            title="Canadian registration numbers are of the format: 123456789AA1234"
            pattern={charityRegistrationNumberRegex}
          />
        </p>
        <p>
          <Label className="mb-2 inline-block" htmlFor="signatoryName">
            Signatory{"'"}s name
          </Label>
          <TextInput
            name="signatoryName"
            id="signatoryName"
            minLength={5}
            defaultValue={doneeInfo.signatoryName ?? undefined}
            required
            title="alphanumeric as well as '-', '_', ','"
            pattern={htmlRegularCharactersRegex}
          />
        </p>
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

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, query }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("details")

  const [account, accountList] = await Promise.all([
    db.query.accounts.findFirst({
      // if the realmId is specified get that account otherwise just get the first account for the user
      where: session.accountId
        ? eq(accounts.id, session.accountId)
        : eq(accounts.scope, "accounting"),
      orderBy: desc(accounts.updatedAt),
      columns: {
        id: true,
        accessToken: true,
        scope: true,
        realmId: true,
        createdAt: true,
        expiresAt: true,
        refreshToken: true,
        refreshTokenExpiresAt: true,
      },
      with: {
        userData: { columns: { id: true } },
        doneeInfo: {
          columns: {
            companyAddress: true,
            companyName: true,
            country: true,
            registrationNumber: true,
            signatoryName: true,
            smallLogo: true,
          },
        },
      },
    }),
    db.query.accounts.findMany({
      columns: { companyName: true, id: true },
      where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
      orderBy: desc(accounts.updatedAt),
    }) as Promise<{ companyName: string; id: string }[]>,
  ])
  if (session.accountId && !account)
    throw new ApiError(500, "account for given user and session not found in db")

  // if the session does not specify an account but there is a connected account
  // then the session is connected to one of these accounts
  if (!session.accountId && account) {
    session.accountId = account.id
    await db
      .update(sessions)
      .set({ accountId: account.id })
      .where(eq(sessions.userId, session.user.id))
  }

  if (
    !account ||
    account.scope !== "accounting" ||
    !account.accessToken ||
    !account.realmId ||
    !session.accountId
  )
    return disconnectedRedirect

  await refreshTokenIfNeeded(account)
  const realmId = account.realmId
  const itemsFilledIn = Boolean(account.userData)

  const doneeInfo = account.doneeInfo
    ? account.doneeInfo
    : await getCompanyInfo(account.accessToken, realmId)

  return {
    props: {
      session,
      doneeInfo,
      itemsFilledIn,
      realmId,
      companies: accountList,
      selectedAccountId: session.accountId,
    } satisfies Props,
  }
}

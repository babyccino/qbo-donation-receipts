import { and, eq, isNotNull, or } from "drizzle-orm"
import { Label, TextInput } from "flowbite-react"
import { GetServerSideProps } from "next"
import { Session } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { useRouter } from "next/router"
import { FormEventHandler, useRef } from "react"

import { Fieldset, ImageInput, Legend } from "@/components/form"
import { buttonStyling } from "@/components/link"
import { disconnectedRedirect, getServerSessionOrThrow } from "@/lib/auth/next-auth-helper-server"
import { RemoveTimestamps, refreshTokenIfNeeded } from "@/lib/db/db-helper"
import { db } from "@/lib/db/test"
import { getCompanyInfo } from "@/lib/qbo-api"
import { charityRegistrationNumberRegex, htmlRegularCharactersRegex } from "@/lib/util/etc"
import { base64DataUrlEncodeFile } from "@/lib/util/image-helper"
import { postJsonData } from "@/lib/util/request"
import { DataType as DetailsApiDataType } from "@/pages/api/details"
import { DoneeInfo } from "@/types/db"
import { accounts, doneeInfos, userDatas, users } from "db/schema"

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
}

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
    await postJsonData("/api/details", { ...formData, realmId } satisfies DetailsApiDataType)

    const destination = itemsFilledIn ? "/generate-receipts" : "/items"
    // router.push({
    //   pathname: destination,
    // })
    router.reload()
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
  const session = await getServerSessionOrThrow(req, res)

  const queryRealmId = typeof query.realmid === "string" ? query.realmid : undefined

  const rows = await db
    .select({
      doneeInfo: {
        companyAddress: doneeInfos.companyAddress,
        companyName: doneeInfos.companyName,
        country: doneeInfos.country,
        registrationNumber: doneeInfos.registrationNumber,
        signatoryName: doneeInfos.signatoryName,
        smallLogo: doneeInfos.smallLogo,
      },
      userData: userDatas.id,
      account: {
        id: accounts.id,
        accessToken: accounts.accessToken,
        realmId: accounts.realmId,
        createdAt: accounts.createdAt,
        expiresAt: accounts.expiresAt,
        refreshToken: accounts.refreshToken,
        refreshTokenExpiresAt: accounts.refreshTokenExpiresAt,
        scope: accounts.scope,
      },
    })
    .from(doneeInfos)
    .fullJoin(
      userDatas,
      and(eq(doneeInfos.realmId, userDatas.realmId), eq(doneeInfos.userId, userDatas.userId)),
    )
    .fullJoin(
      accounts,
      or(
        and(eq(accounts.realmId, doneeInfos.realmId), eq(accounts.userId, doneeInfos.userId)),
        and(eq(accounts.realmId, userDatas.realmId), eq(accounts.userId, userDatas.userId)),
      ),
    )
    .rightJoin(
      users,
      or(eq(users.id, doneeInfos.id), eq(users.id, userDatas.id), eq(users.id, accounts.userId)),
    )
    .where(
      and(
        eq(users.id, session.user.id),
        queryRealmId ? eq(accounts.realmId, queryRealmId) : isNotNull(accounts.realmId),
      ),
    )
    .limit(1)

  const row = rows.at(0)
  if (!row) throw new ApiError(500, "user not found in db")
  const { account } = row
  if (!account || account.scope !== "accounting" || !account.accessToken)
    return disconnectedRedirect
  const realmId = queryRealmId ?? account.realmId
  if (!realmId) return disconnectedRedirect

  // @ts-ignore
  refreshTokenIfNeeded(account)

  const doneeInfo = row.doneeInfo
    ? row.doneeInfo
    : await getCompanyInfo(account.accessToken, realmId)

  const itemsFilledIn = Boolean(row.userData)

  return {
    props: {
      session,
      doneeInfo,
      itemsFilledIn,
      realmId,
    } satisfies Props,
  }
}

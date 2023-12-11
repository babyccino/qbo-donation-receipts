import { createId } from "@paralleldrive/cuid2"
import { desc, eq } from "drizzle-orm"
import { Label, TextInput } from "flowbite-react"
import { ApiError } from "next/dist/server/api-utils"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getServerSession } from "@/app/auth-util"
import { ImageInput } from "@/components/form-client"
import { Fieldset, Legend } from "@/components/form-server"
import { buttonStyling } from "@/components/link"
import { refreshTokenIfStale } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { resizeAndUploadArrayBuffer } from "@/lib/db/db-helper"
import { storageBucket } from "@/lib/db/firebase"
import { getCompanyInfo } from "@/lib/qbo-api"
import { isFileSupported } from "@/lib/util/image-helper"
import {
  charityRegistrationNumberRegex,
  charityRegistrationNumberRegexString,
  htmlRegularCharactersRegexString,
  regularCharacterRegex,
} from "@/lib/util/regex"
import { parseRequestBody } from "@/lib/util/request-server"
import { accounts, doneeInfos, sessions } from "db/schema"

const imageHelper = "PNG, JPG, WebP or GIF (max 100kb)."
const imageNotRequiredHelper = (
  <>
    <p className="mb-2">{imageHelper}</p>
    <p>Choose an image if you wish to replace your saved image</p>
  </>
)

const MAX_FILE_SIZE = 102400

const zodRegularString = z.string().regex(regularCharacterRegex)
export const parser = z.object({
  companyName: zodRegularString,
  companyAddress: zodRegularString,
  country: zodRegularString,
  registrationNumber: z.string().regex(charityRegistrationNumberRegex),
  signatoryName: zodRegularString,
})

export default async function Details() {
  const session = await getServerSession()
  if (!session) return redirect("/auth/signin?callback=details"), null

  const account = await db.query.accounts.findFirst({
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
  })
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
    return redirect("/auth/disconnected"), null

  await refreshTokenIfStale(account)

  const realmId = account.realmId
  const itemsFilledIn = Boolean(account.userData)

  const doneeInfo = (
    account.doneeInfo ? account.doneeInfo : await getCompanyInfo(account.accessToken, realmId)
  ) as {
    companyAddress?: string
    companyName?: string
    country?: string
    registrationNumber?: string
    signatoryName?: string
    smallLogo?: string
  }

  async function formAction(formData: FormData) {
    "use server"

    const session = await getServerSession()
    if (!session?.accountId) throw new ApiError(401, "user not connected")

    const id = session.user.id

    const body = {
      companyName: formData.get("companyName"),
      companyAddress: formData.get("companyAddress"),
      country: formData.get("country"),
      registrationNumber: formData.get("registrationNumber"),
      signatoryName: formData.get("signatoryName"),
    }
    const data = parseRequestBody(parser, body)

    const signature = formData.get("signature") as File
    const smallLogo = formData.get("smallLogo") as File

    if (signature && !isFileSupported(signature, MAX_FILE_SIZE))
      throw new ApiError(400, "signature's file type is not supported'")
    if (smallLogo && !isFileSupported(smallLogo, MAX_FILE_SIZE))
      throw new ApiError(400, "smallLogo's file type is not supported'")

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.accountId),
      columns: {
        id: true,
        accessToken: true,
        expiresAt: true,
        refreshToken: true,
        refreshTokenExpiresAt: true,
        realmId: true,
      },
      with: { doneeInfo: { columns: { id: true } } },
    })

    if (!account) throw new ApiError(401, "account not found for given userid and company realmid")
    const { realmId } = account
    if (!realmId) throw new ApiError(401, "account not associated with a company")

    await refreshTokenIfStale(account)

    if (!account.doneeInfo && (!signature || !smallLogo))
      throw new ApiError(
        400,
        "when setting user data for the first time, signature and logo images must be provided",
      )

    const signaturePath = `${id}/${realmId}/signature`
    const smallLogoPath = `${id}/${realmId}/smallLogo`
    const [signatureUrl, smallLogoUrl] = await Promise.all([
      signature
        ? resizeAndUploadArrayBuffer(
            storageBucket,
            await signature.arrayBuffer(),
            { height: 150 },
            signaturePath,
            false,
          )
        : undefined,
      smallLogo
        ? resizeAndUploadArrayBuffer(
            storageBucket,
            await smallLogo.arrayBuffer(),
            { height: 100, width: 100 },
            smallLogoPath,
            true,
          )
        : undefined,
    ])

    const doneeInfo = account.doneeInfo
      ? await db
          .update(doneeInfos)
          .set({
            ...data,
            signature: signatureUrl,
            smallLogo: smallLogoUrl,
            largeLogo: "",
            updatedAt: new Date(),
          })
          .where(eq(doneeInfos.id, account.doneeInfo.id))
          .returning()
      : await db
          .insert(doneeInfos)
          .values({
            ...data,
            id: createId(),
            accountId: account.id,
            signature: signatureUrl as string,
            smallLogo: smallLogoUrl as string,
            largeLogo: "",
          })
          .returning()

    redirect(itemsFilledIn ? "/generate-receipts" : "/items")
  }

  return (
    <form action={formAction} className="w-full max-w-2xl space-y-4 p-4">
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
            pattern={htmlRegularCharactersRegexString}
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
            pattern={htmlRegularCharactersRegexString}
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
            pattern={htmlRegularCharactersRegexString}
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
            pattern={charityRegistrationNumberRegexString}
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
            pattern={htmlRegularCharactersRegexString}
          />
        </p>
        <ImageInput
          id="signature"
          label="Image of signatory's signature"
          maxSize={MAX_FILE_SIZE}
          helper={doneeInfo.signatoryName ? imageNotRequiredHelper : imageHelper}
          required={!Boolean(doneeInfo.signatoryName)}
        />
        <ImageInput
          id="smallLogo"
          label="Small image of organisation's logo"
          maxSize={MAX_FILE_SIZE}
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

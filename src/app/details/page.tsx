import { desc, eq } from "drizzle-orm"
import { Label, TextInput } from "flowbite-react"
import { ApiError } from "next/dist/server/api-utils"

import { Fieldset, ImageInput, Legend } from "@/components/form"
import { buttonStyling } from "@/components/link"
import { refreshTokenIfNeeded } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { resizeAndUploadArrayBuffer } from "@/lib/db/db-helper"
import { storageBucket } from "@/lib/db/firebase"
import { getCompanyInfo } from "@/lib/qbo-api"
import { charityRegistrationNumberRegex, htmlRegularCharactersRegex } from "@/lib/util/etc"
import { imageIsSupported } from "@/lib/util/image-helper"
import { createId } from "@paralleldrive/cuid2"
import { accounts, doneeInfos, sessions } from "db/schema"
import { redirect } from "next/navigation"
import { getServerSession, getServerSessionOrThrow } from "../auth-util"

const imageHelper = "PNG, JPG, WebP or GIF (max 100kb)."
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
  const session = await getServerSession()
  if (!session) return redirect("/auth/signin?callback=details")

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
    return redirect("/auth/disconnected")

  await refreshTokenIfNeeded(account)

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
    const session = await getServerSessionOrThrow()
    if (!session.accountId) throw new ApiError(401, "user's account not connected")

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

    const signature = formData.get("signature") as File
    const smallLogo = formData.get("smallLogo") as File

    if (!account.doneeInfo && (!signature || !smallLogo))
      throw new ApiError(
        400,
        "when setting user data for the first time, signature and logo images must be provided",
      )

    await refreshTokenIfNeeded(account)

    const signaturePath = `${session.user.id}/${realmId}/signature`
    const smallLogoPath = `${session.user.id}/${realmId}/smallLogo`

    const [signatureUrl, smallLogoUrl] = await Promise.all([
      isFileSupported(signature)
        ? resizeAndUploadArrayBuffer(
            storageBucket,
            await signature.arrayBuffer(),
            { height: 150 },
            signaturePath,
            false,
          )
        : undefined,
      isFileSupported(smallLogo)
        ? resizeAndUploadArrayBuffer(
            storageBucket,
            await smallLogo.arrayBuffer(),
            { height: 100, width: 100 },
            smallLogoPath,
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

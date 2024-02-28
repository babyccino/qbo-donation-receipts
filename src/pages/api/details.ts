import { createId } from "@paralleldrive/cuid2"
import { eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { z } from "zod"

import { refreshTokenIfNeeded } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { isJpegOrPngDataURL } from "@/lib/util/image-helper"
import { charityRegistrationNumberRegexString, regularCharacterRegex } from "@/lib/util/regex"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { accounts, doneeInfos } from "db/schema"
import { resizeAndUploadImage } from "@/lib/util/image-helper-server"

const dataUrlRefiner = (str: string | undefined) => (str ? isJpegOrPngDataURL(str) : true)

const zodRegularString = z.string().regex(regularCharacterRegex)
export const parser = z.object({
  companyName: zodRegularString,
  companyAddress: zodRegularString,
  country: zodRegularString,
  registrationNumber: z.string().regex(new RegExp(charityRegistrationNumberRegexString)),
  signatoryName: zodRegularString,
  signature: z.string().optional().refine(dataUrlRefiner),
  smallLogo: z.string().optional().refine(dataUrlRefiner),
})
export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async (req, res, session) => {
  if (!session.accountId) throw new ApiError(401, "user not connected")
  const id = session.user.id

  const data = parseRequestBody(parser, req.body)

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

  await refreshTokenIfNeeded(account)

  if (!account.doneeInfo && (!data.signature || !data.smallLogo))
    throw new ApiError(
      400,
      "when setting user data for the first time, signature and logo images must be provided",
    )

  const signaturePath = `${id}/${realmId}/signature`
  const smallLogoPath = `${id}/${realmId}/smallLogo`
  const [signatureUrl, smallLogoUrl] = await Promise.all([
    data.signature
      ? resizeAndUploadImage(data.signature, { height: 150 }, signaturePath, false)
      : undefined,
    data.smallLogo
      ? resizeAndUploadImage(data.smallLogo, { height: 100, width: 100 }, smallLogoPath, true)
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

  res.status(200).json(doneeInfo)
}

export default createAuthorisedHandler(handler, ["POST"])

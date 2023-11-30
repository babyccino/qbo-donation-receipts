import { createId } from "@paralleldrive/cuid2"
import { and, eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import sharp from "sharp"
import { z } from "zod"

import { storageBucket } from "@/lib/db"
import { db } from "@/lib/db/test"
import { charityRegistrationNumberRegex, regularCharactersRegex } from "@/lib/util/etc"
import {
  base64FileSize,
  dataUrlToBase64,
  isJpegOrPngDataURL,
  maxFileSizeBytes,
  supportedExtensions,
} from "@/lib/util/image-helper"
import {
  AuthorisedHandler,
  createAuthorisedHandler,
  parseRequestBody,
} from "@/lib/util/request-server"
import { accounts, doneeInfos } from "db/schema"
import { refreshTokenIfNeeded } from "@/lib/db/db-helper"

// TODO move file storage to another service
async function resizeAndUploadImage(
  dataUrl: string,
  dimensions: { width?: number; height?: number },
  path: string,
  pub: boolean,
): Promise<string> {
  const base64 = dataUrlToBase64(dataUrl)
  const buffer = Buffer.from(base64, "base64")
  const extension = dataUrl.substring("data:image/".length, dataUrl.indexOf(";base64"))
  if (!supportedExtensions.includes(extension))
    throw new ApiError(400, "File uploaded is not of type: " + supportedExtensions.join(", "))

  if (base64FileSize(base64) >= maxFileSizeBytes)
    throw new ApiError(500, "File uploaded is too large")

  const background =
    extension === "png" || extension === "webp"
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : { r: 0, g: 0, b: 0 }
  const resizedBuffer = await sharp(buffer)
    .resize({ ...dimensions, fit: "contain", background })
    .toFormat("webp")
    .toBuffer()
  const fullPath = `${path}.webp`
  const file = storageBucket.file(fullPath)
  await file.save(resizedBuffer, { contentType: "image/webp" })
  if (pub) await file.makePublic()
  return fullPath
}

const dataUrlRefiner = (str: string | undefined) => (str ? isJpegOrPngDataURL(str) : true)

const zodRegularString = z.string().regex(new RegExp(regularCharactersRegex))
export const parser = z.object({
  companyName: zodRegularString,
  companyAddress: zodRegularString,
  country: zodRegularString,
  registrationNumber: z.string().regex(new RegExp(charityRegistrationNumberRegex)),
  signatoryName: zodRegularString,
  signature: z.string().optional().refine(dataUrlRefiner),
  smallLogo: z.string().optional().refine(dataUrlRefiner),
  realmId: z.string(),
})
export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async (req, res, session) => {
  const id = session.user.id

  const { realmId, ...data } = parseRequestBody(parser, req.body)

  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, id), eq(accounts.realmId, realmId)),
    columns: {
      id: true,
      accessToken: true,
      expiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
    },
    with: { doneeInfo: { columns: { id: true } } },
  })

  if (!account) throw new ApiError(401, "account not found for given userid and company realmid")

  await refreshTokenIfNeeded(account)

  if (!account.doneeInfo) {
    if (!data.signature || !data.smallLogo)
      throw new ApiError(
        400,
        "when setting user data for the first time, signature and logo images must be provided",
      )

    const [signatureUrl, smallLogoUrl] = await Promise.all([
      resizeAndUploadImage(data.signature, { height: 150 }, `${id}/signature`, false),
      resizeAndUploadImage(data.smallLogo, { height: 100, width: 100 }, `${id}/smallLogo`, true),
    ])

    await db.insert(doneeInfos).values({
      id: createId(),
      accountId: account.id,
      signature: signatureUrl,
      smallLogo: smallLogoUrl,
      largeLogo: "",
      ...data,
    })
  } else {
    const [signatureUrl, smallLogoUrl] = await Promise.all([
      data.signature
        ? resizeAndUploadImage(data.signature, { height: 150 }, `${id}/signature`, false)
        : undefined,
      data.smallLogo
        ? resizeAndUploadImage(data.smallLogo, { height: 100, width: 100 }, `${id}/smallLogo`, true)
        : undefined,
    ])

    await db
      .update(doneeInfos)
      .set({
        ...data,
        signature: signatureUrl,
        smallLogo: smallLogoUrl,
        largeLogo: "",
        updatedAt: new Date(),
      })
      .where(eq(doneeInfos.id, account.doneeInfo.id))
  }

  const set = await db
    .select()
    .from(doneeInfos)
    .where(and(eq(doneeInfos.accountId, account.id)))
  res.status(200).json(set)
}

export default createAuthorisedHandler(handler, ["POST"])

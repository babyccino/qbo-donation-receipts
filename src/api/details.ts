import { ApiError } from "next/dist/server/api-utils"
import sharp from "sharp"
import { z } from "zod"

import { charityRegistrationNumberRegex, regularCharactersRegex } from "@/lib/util/etc"
import {
  base64FileSize,
  dataUrlToBase64,
  assertExtensionSupported,
  isJpegOrPngDataURL,
  maxFileSizeBytes,
} from "@/lib/util/image-helper"
import { AuthorisedHandler, parseRequestBody } from "@/lib/util/request-server"
import { FileStorage, UserData } from "@/types/db"

async function resizeAndUploadImage(
  fileStorage: FileStorage,
  id: string,
  name: string,
  dataUrl: string,
  dimensions: { width?: number; height?: number },
  publicUrl?: boolean,
) {
  const extension = dataUrl.substring("data:image/".length, dataUrl.indexOf(";base64"))
  assertExtensionSupported(extension)

  const base64 = dataUrlToBase64(dataUrl)
  if (base64FileSize(base64) >= maxFileSizeBytes)
    throw new ApiError(500, "File uploaded is too large")

  const buffer = Buffer.from(base64, "base64")

  const background =
    extension === "png" || extension === "webp"
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : { r: 0, g: 0, b: 0 }
  const resizedBuffer = await sharp(buffer)
    .resize({ ...dimensions, fit: "contain", background })
    .toFormat("webp")
    .toBuffer()
  const fileName = `${name}.webp`
  await fileStorage.saveFile(id, fileName, resizedBuffer, { contentType: "image/webp", publicUrl })
  return fileName
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
})
export type DetailsDataType = z.infer<typeof parser>

export const createHandler = (user: UserData, fileStorage: FileStorage) =>
  (async (req, res, session) => {
    const { id } = session.user

    const data = parseRequestBody(parser, req.body)
    const { signature: signatureDataUrl, smallLogo: smallLogoDataUrl } = data

    const [signaturePath, smallLogoPath] = await Promise.all([
      signatureDataUrl
        ? resizeAndUploadImage(
            fileStorage,
            id,
            "signature",
            signatureDataUrl,
            { height: 150 },
            false,
          )
        : undefined,
      smallLogoDataUrl
        ? resizeAndUploadImage(
            fileStorage,
            id,
            "smallLogo",
            smallLogoDataUrl,
            { height: 100, width: 100 },
            true,
          )
        : undefined,
    ])

    const newData = { donee: { ...data, signature: signaturePath, smallLogo: smallLogoPath } }
    await user.set(id, newData)

    res.status(200).json(newData)
  }) satisfies AuthorisedHandler

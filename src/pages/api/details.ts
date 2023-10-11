import { ApiError } from "next/dist/server/api-utils"
import sharp from "sharp"
import { z } from "zod"

import { storageBucket, user } from "@/lib/db"
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

  const background = extension === "png" ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 0, g: 0, b: 0 }
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

export const parser = z.object({
  companyName: z.string(),
  companyAddress: z.string(),
  country: z.string(),
  registrationNumber: z.string(),
  signatoryName: z.string(),
  signature: z.string().optional().refine(dataUrlRefiner),
  smallLogo: z.string().optional().refine(dataUrlRefiner),
})
export type DataType = z.infer<typeof parser>

const handler: AuthorisedHandler = async (req, res, session) => {
  const id = session.user.id

  const data = parseRequestBody(parser, req.body)

  const [signatureUrl, smallLogoUrl] = await Promise.all([
    data.signature
      ? resizeAndUploadImage(data.signature, { height: 150 }, `${id}/signature`, false)
      : undefined,
    data.smallLogo
      ? resizeAndUploadImage(data.smallLogo, { height: 100, width: 100 }, `${id}/smallLogo`, true)
      : undefined,
  ])

  const newData = { donee: { ...data, signature: signatureUrl, smallLogo: smallLogoUrl } }
  await user.doc(id).set(newData, { merge: true })

  res.status(200).json(newData)
}

export default createAuthorisedHandler(handler, ["POST"])

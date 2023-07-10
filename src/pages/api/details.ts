import { z } from "zod"

import { storageBucket, user } from "@/lib/db"
import { AuthorisedHanlder, createAuthorisedHandler, parseRequestBody } from "@/lib/app-api"
import { isJpegOrPngDataURL } from "@/lib/util/request"

async function uploadImage(dataUrl: string, path: string, pub: boolean): Promise<string> {
  const extension = dataUrl.substring("data:image/".length, dataUrl.indexOf(";base64"))
  const base64String = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const buffer = Buffer.from(base64String, "base64")
  const fullPath = `${path}.${extension}`
  const file = storageBucket.file(fullPath)
  void file.save(buffer, { contentType: "image" })
  if (pub) file.makePublic()
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

const handler: AuthorisedHanlder = async (req, res, session) => {
  const id = session.user.id

  const data = parseRequestBody(parser, req.body)

  const [signatureUrl, smallLogoUrl] = await Promise.all([
    data.signature ? uploadImage(data.signature, `${id}/signature`, false) : undefined,
    data.smallLogo ? uploadImage(data.smallLogo, `${id}/smallLogo`, true) : undefined,
  ])

  const newData = { donee: { ...data, signature: signatureUrl, smallLogo: smallLogoUrl } }
  await user.doc(id).set(newData, { merge: true })

  res.status(200).json(newData)
}

export default createAuthorisedHandler(handler, ["POST"])

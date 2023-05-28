import { z } from "zod"

import { storageBucket, user } from "@/lib/db"
import { AuthorisedHanlder, createAuthorisedHandler, parseRequestBody } from "@/lib/app-api"
import { isJpegOrPngDataURL } from "@/lib/util"

async function uploadImage(dataUrl: string, path: string): Promise<string> {
  const extension = dataUrl.substring("data:image/".length, dataUrl.indexOf(";base64"))
  const base64String = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const buffer = Buffer.from(base64String, "base64")
  const file = storageBucket.file(`${path}.${extension}`)
  await file.save(buffer, { contentType: "image" })
  file.makePublic()
  return file.publicUrl()
}

const dataUrlRefiner = (str: string | undefined) => (str ? isJpegOrPngDataURL(str) : true)

const handler: AuthorisedHanlder = async (req, res, session) => {
  const id = session.user.id

  const data = parseRequestBody(
    {
      companyName: z.string(),
      companyAddress: z.string(),
      country: z.string(),
      registrationNumber: z.string(),
      signatoryName: z.string(),
      signature: z.string().optional().refine(dataUrlRefiner),
      smallLogo: z.string().optional().refine(dataUrlRefiner),
    },
    req.body
  )

  const [signatureUrl, smallLogoUrl] = await Promise.all([
    data.signature ? uploadImage(data.signature, `${id}/signature`) : undefined,
    data.smallLogo ? uploadImage(data.smallLogo, `${id}/smallLogo`) : undefined,
  ])

  const newData = { donee: { ...data, signature: signatureUrl, smallLogo: smallLogoUrl } }
  await user.doc(id).set(newData, { merge: true })

  res.status(200).json(newData)
}

export default createAuthorisedHandler(handler, ["POST"])

import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { storageBucket, user } from "@/lib/db"
import { authOptions } from "./auth/[...nextauth]"
import { isJpegOrPngDataURL, parseRequestBody } from "@/lib/app-api"

async function uploadImage(dataUrl: string, path: string): Promise<string> {
  const extension = dataUrl.substring("data:image/".length, dataUrl.indexOf(";base64"))
  const base64String = dataUrl.slice(dataUrl.indexOf(",") + 1)
  const buffer = Buffer.from(base64String, "base64")
  const file = storageBucket.file(`${path}.${extension}`)
  await file.save(buffer, { contentType: "image" })
  file.makePublic()
  return file.publicUrl()
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).end()
  const id = session.user.id

  try {
    const data = parseRequestBody(
      {
        companyName: z.string(),
        companyAddress: z.string(),
        country: z.string(),
        registrationNumber: z.string(),
        signatoryName: z.string(),
        signature: z.string().refine(isJpegOrPngDataURL),
        smallLogo: z.string().refine(isJpegOrPngDataURL),
      },
      req.body
    )

    const [signatureUrl, smallLogoUrl] = await Promise.all([
      uploadImage(data.signature, `${id}/signature`),
      uploadImage(data.smallLogo, `${id}/smallLogo`),
    ])
    const newData = { donee: { ...req.body, signature: signatureUrl, smallLogo: smallLogoUrl } }
    await user.doc(id).update(newData)

    res.status(200).json(newData)
  } catch (error) {
    console.error(error)
    return res.status(400).json(error)
  }
}

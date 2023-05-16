import { TypeOf, ZodObject, ZodRawShape, z } from "zod"
import { DbUser } from "./db"

export async function fetchJsonData<T = any>(url: string, accessToken?: string): Promise<T> {
  const response = await (accessToken
    ? fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      })
    : fetch(url, {
        headers: {
          Accept: "application/json",
        },
      }))

  if (!response.ok) {
    throw new Error(`GET request to url: ${url} failed`)
  }

  const report: T = await response.json()
  return report
}

export async function postJsonData<T = any>(url: string, json: any): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  })

  if (!response.ok) {
    throw new Error(`POST request to url: ${url} failed`)
  }

  const report: T = await response.json()
  return report
}

export function alreadyFilledIn(doc: FirebaseFirestore.DocumentSnapshot<DbUser>): {
  items: boolean
  doneeDetails: boolean
} {
  const dbData = doc.data()

  if (!dbData) return { items: false, doneeDetails: false }

  const { items, donee, date } = dbData
  const {
    companyAddress,
    companyName,
    country,
    registrationNumber,
    signatoryName,
    signature,
    smallLogo,
  } = donee || {}

  return {
    items: Boolean(items && date),
    doneeDetails: Boolean(
      companyAddress &&
        companyName &&
        country &&
        registrationNumber &&
        signatoryName &&
        signature &&
        smallLogo
    ),
  }
}

export function isJpegOrPngDataURL(str: string): boolean {
  if (!str.startsWith("data:image/jpeg;base64,") && !str.startsWith("data:image/png;base64,")) {
    return false
  }
  const regex = /^data:image\/(jpeg|png);base64,([a-zA-Z0-9+/]*={0,2})$/
  return regex.test(str)
}

export const base64EncodeString = (str: string) => Buffer.from(str).toString("base64")

export const base64EncodeFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })

export function parseRequestBody<T extends ZodRawShape>(shape: T, body: any): TypeOf<ZodObject<T>> {
  const response = z.object(shape).safeParse(body)

  if (!response.success) {
    const { errors } = response.error

    throw { message: "Invalid request", errors }
  }

  return response.data
}

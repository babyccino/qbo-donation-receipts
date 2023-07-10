import { DataType as CheckoutSessionDataType } from "@/pages/api/stripe/create-checkout-session"
import { config } from "@/lib/util/config"

const { vercelEnv, vercelBranchUrl, vercelUrl, productionUrl } = config

export async function subscribe(redirect?: string) {
  const data: CheckoutSessionDataType = { redirect }
  const { url } = await postJsonData("/api/stripe/create-checkout-session", data)

  if (typeof url !== "string") throw new Error()

  window.location.replace(url)
}

const formatUrl = (url: string) => `https://${url}${url.at(-1) === "/" ? "" : "/"}`
export const getBaseUrl = () => {
  if (vercelEnv === "preview") return formatUrl(vercelBranchUrl ?? "")
  if (vercelEnv === "production") return formatUrl(productionUrl ?? vercelUrl ?? "")
  return "http://localhost:3000/"
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

export async function getResponseContent(response: Response) {
  const contentType = response.headers.get("content-type")
  if (contentType && contentType.includes("application/json")) {
    return response.json()
  } else {
    return await response.text()
  }
}

export async function fetchJsonData<T = any>(url: string, accessToken?: string): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const response = await fetch(url, {
    headers,
  })

  console.log({ url, response })

  const responseContent = await getResponseContent(response)
  if (!response.ok) {
    throw new Error(`GET request to url: ${url} failed, error: ${JSON.stringify(responseContent)}}`)
  }

  return responseContent as T
}

export async function postJsonData<T = any>(url: string, json?: any): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: json && JSON.stringify(json),
  })

  const responseContent = await getResponseContent(response)
  if (!response.ok) {
    throw new Error(`POST request to url: ${url} failed, error: ${responseContent}}`)
  }

  return responseContent as T
}

export async function deleteJsonData<T = any>(url: string, json?: any): Promise<T> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: json && JSON.stringify(json),
  })

  const responseContent = await getResponseContent(response)
  if (!response.ok) {
    throw new Error(`DELETE request to url: ${url} failed, error: ${responseContent}}`)
  }

  return responseContent as T
}

export async function putJsonData<T = any>(url: string, json?: any): Promise<T> {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: json && JSON.stringify(json),
  })

  const responseContent = await getResponseContent(response)
  if (!response.ok) {
    throw new Error(`PUT request to url: ${url} failed, error: ${responseContent}}`)
  }

  return responseContent as T
}

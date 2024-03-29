import { DataType as CheckoutSessionDataType } from "@/pages/api/stripe/create-checkout-session"
import { config } from "@/lib/util/config"
import { ApiError } from "next/dist/server/api-utils"

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
    console.error(`POST request to url: ${url} failed, error: ${responseContent}}`)
    throw new ApiError(response.status, responseContent)
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

export async function subscribe() {
  const { url } = await postJsonData("/api/stripe/create-checkout-session", {
    priceId: "price_1NB3qQGK67vW62jMlz5UyIPm",
  })

  if (typeof url !== "string") throw new Error()

  window.location.replace(url)
}

export const getBaseUrl = () => {
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  const url = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000/"
  if (url.at(-1) === "/") return url
  else return `${url}/`
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

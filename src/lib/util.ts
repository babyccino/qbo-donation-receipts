const padZero = (n: number) => (n < 10 ? `0${n}` : n.toString())
export const formatDate = (date: Date) =>
  `${padZero(date.getDate())}/${padZero(date.getMonth() + 1)}/${date.getFullYear()}`
export const formatDateHtml = (date: Date) =>
  `${padZero(date.getDate())}-${padZero(date.getMonth() + 1)}-${date.getFullYear()}`
export const formatDateHtmlReverse = (date: Date) =>
  `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`

export const getThisYear = () => new Date().getFullYear()
export const startOfPreviousYearHtml = () => `${getThisYear() - 1}-01-01`
export const endOfPreviousYearHtml = () => `${getThisYear() - 1}-12-31`
export const startOfThisYearHtml = () => `${getThisYear()}-01-01`
export const endOfThisYearHtml = () => `${getThisYear()}-12-31`
export const startOfPreviousYear = () => new Date(getThisYear() - 1, 0, 1)
export const endOfPreviousYear = () => new Date(getThisYear() - 1, 11, 31)
export const startOfThisYear = () => new Date(getThisYear(), 0, 1)
export const endOfThisYear = () => new Date(getThisYear(), 11, 31)
export const getCurrentDateHtml = () => formatDateHtml(new Date())

export enum DateRangeType {
  LastYear = "LastYear",
  ThisYear = "ThisYear",
  Ytd = "Ytd",
  Custom = "Custom",
}

export const multipleClasses = (...args: (string | undefined)[]) =>
  args.reduce<string>((prev, curr): string => {
    if (curr === undefined || curr === "") return prev
    if (prev === "") return curr
    return `${prev} ${curr}`
  }, "")

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

export const getBaseUrl = () => {
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  const url = vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000/"
  if (url.at(-1) === "/") return url
  else return `${url}/`
}

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

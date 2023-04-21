export const base64Encode = (str: string) => Buffer.from(str).toString("base64")

export const formatDate = (date: Date) =>
  `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
export const formatDateHtml = (date: Date) =>
  `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`

const getThisYear = () => new Date().getFullYear()
export const startOfPreviousYearHtml = () => `${getThisYear() - 1}-01-01`
export const endOfPreviousYearHtml = () => `${getThisYear() - 1}-12-31`
export const startOfThisYearHtml = () => `${getThisYear()}-01-01`
export const endOfThisYearHtml = () => `${getThisYear()}-12-31`
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

export async function fetchJsonData<T = any>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })
  const report: T = await response.json()

  if (!response.ok) {
    throw { ...report, url }
  }

  return report
}

export type Session = {
  user: {
    id: string
    name: string
    image: string
    email: string
  }
  expires: string
  accessToken: string
  realmId: string
}

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

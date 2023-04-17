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
export const getCurrentDateHtml = (date: Date) => formatDateHtml(new Date())

export enum DateRangeType {
  LastYear = "LastYear",
  ThisYear = "ThisYear",
  Ytd = "Ytd",
  Custom = "Custom",
}

export function multipleClasses(...args: (string | undefined)[]): string {
  return args.reduce((prev, curr): string | undefined => {
    return curr === undefined || curr === "" ? prev : `${prev} ${curr}`
  }) as string
}

export async function fetchJsonData<T>(url: string, accessToken: string): Promise<T> {
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

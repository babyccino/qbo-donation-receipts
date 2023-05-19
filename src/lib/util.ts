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

export const formatDate = (date: Date) =>
  `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
export const formatDateHtml = (date: Date) =>
  `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
export const formatDateHtmlReverse = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

export const getThisYear = () => new Date().getFullYear()
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

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

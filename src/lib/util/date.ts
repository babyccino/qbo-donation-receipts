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
export const utcEpoch = () => new Date(0)

export const oneHrFromNow = () => new Date(Date.now() + 1000 * 60 * 60)

export enum DateRangeType {
  LastYear = "LastYear",
  ThisYear = "ThisYear",
  Ytd = "Ytd",
  AllTime = "AllTime",
  Custom = "Custom",
}

const MS_IN_DAY = 1000 * 60 * 60 * 24
export function getDaysBetweenDates(date1: Date, date2: Date) {
  const timeDiffMs = Math.abs(date2.getTime() - date1.getTime())
  const days = Math.ceil(timeDiffMs / MS_IN_DAY)
  return days
}

export type DateRange = {
  startDate: Date
  endDate: Date
}
export function doDateRangesIntersect(date1: DateRange, date2: DateRange): boolean {
  return (
    date1.endDate.getTime() > date2.startDate.getTime() &&
    date1.startDate.getTime() < date2.endDate.getTime()
  )
}
export const createDateRange = (startDateString: string, endDateString: string): DateRange => ({
  startDate: new Date(startDateString),
  endDate: new Date(endDateString),
})

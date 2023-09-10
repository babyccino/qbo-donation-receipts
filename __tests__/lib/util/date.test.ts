import { test, describe, expect } from "bun:test"

import {
  DateRange,
  doDateRangesIntersect,
  formatDate,
  formatDateHtml,
  formatDateHtmlReverse,
} from "@/lib/util/date"

describe("formatDate", () => {
  test("formats a date as dd/mm/yyyy", () => {
    expect(formatDate(new Date("2023/04/20"))).toEqual("20/04/2023")
    expect(formatDate(new Date("1995/10/05"))).toEqual("05/10/1995")
  })
})

describe("formatDateHtml", () => {
  test("formats a date as yyyy-mm-dd", () => {
    expect(formatDateHtml(new Date("2023/04/20"))).toEqual("20-04-2023")
    expect(formatDateHtml(new Date("1995/10/05"))).toEqual("05-10-1995")
  })
})

describe("formatDateHtmlReverse", () => {
  test("formats a date as yyyy-mm-dd", () => {
    expect(formatDateHtmlReverse(new Date("2023/04/20"))).toEqual("2023-04-20")
    expect(formatDateHtmlReverse(new Date("1995/10/05"))).toEqual("1995-10-05")
  })
})

describe("doDateRangesIntersect", () => {
  test("returns correct values", () => {
    const date1: DateRange = { startDate: new Date(0), endDate: new Date(1000) }
    const date2: DateRange = { startDate: new Date(500), endDate: new Date(1500) }
    const date3: DateRange = { startDate: new Date(1500), endDate: new Date(2500) }
    const date4: DateRange = { startDate: new Date(0), endDate: new Date(1500) }
    const date5: DateRange = { startDate: new Date(0), endDate: new Date(500) }
    expect(doDateRangesIntersect(date1, date1)).toBeTruthy()
    expect(doDateRangesIntersect(date1, date2)).toBeTruthy()
    expect(doDateRangesIntersect(date2, date1)).toBeTruthy()
    expect(doDateRangesIntersect(date1, date3)).toBeFalsy()
    expect(doDateRangesIntersect(date3, date1)).toBeFalsy()
    expect(doDateRangesIntersect(date2, date3)).toBeFalsy()
    expect(doDateRangesIntersect(date3, date2)).toBeFalsy()
    expect(doDateRangesIntersect(date1, date4)).toBeTruthy()
    expect(doDateRangesIntersect(date4, date1)).toBeTruthy()
    expect(doDateRangesIntersect(date1, date5)).toBeTruthy()
    expect(doDateRangesIntersect(date5, date1)).toBeTruthy()
  })
})

import { test, describe, expect } from "bun:test"

import {
  DateRange,
  doDateRangesIntersect,
  formatDate,
  formatDateHtml,
  formatDateHtmlReverse,
  getDonationRange,
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

    const date6: DateRange = { startDate: new Date("2022-07-01"), endDate: new Date("2023-06-30") }
    const date7: DateRange = { startDate: new Date("2023-01-01"), endDate: new Date("2023-12-31") }
    expect(doDateRangesIntersect(date6, date7)).toBeTruthy()
  })
})

describe("getDonationRange", () => {
  test("returns correct range when donations span a single month", () => {
    const startDate = new Date("2023-04-01T00:00:00.000Z")
    const endDate = new Date("2023-04-30T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2023 April")
  })

  test("returns correct range when dates are in different years", () => {
    const startDate = new Date("2022-12-01T00:00:00.000Z")
    const endDate = new Date("2023-01-31T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2022-12-01 - 2023-01-31")
  })

  test("returns correct range when month start and end are on the first and last day of the month and different years", () => {
    const startDate = new Date("2022-01-01T00:00:00.000Z")
    const endDate = new Date("2023-12-31T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2022 - 2023")
  })

  test("returns correct range when month start and end are on the first and last day of the month and same year", () => {
    const startDate = new Date("2022-01-01T00:00:00.000Z")
    const endDate = new Date("2022-12-31T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2022")
  })

  test("returns correct range when month start and end are not on the first and last day of the month", () => {
    const startDate = new Date("2023-04-01T00:00:00.000Z")
    const endDate = new Date("2023-05-15T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2023-04-01 - 2023-05-15")
  })

  test("returns correct range when month start and end are not on the first and last day of the month and different years", () => {
    const startDate = new Date("2022-12-15T00:00:00.000Z")
    const endDate = new Date("2023-01-15T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2022-12-15 - 2023-01-15")
  })

  test("returns correct range when month start and end are on the first and last day of the month and same year but different months", () => {
    const startDate = new Date("2022-04-01T00:00:00.000Z")
    const endDate = new Date("2022-05-31T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2022 April - May")
  })

  test("returns correct range when month start and end are on the first and last day of the month and different years but same months", () => {
    const startDate = new Date("2022-04-01T00:00:00.000Z")
    const endDate = new Date("2023-04-30T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2022-04-01 - 2023-04-30")
  })

  test("returns correct range when month start and end are not on the first and last day of the month and different years but same months", () => {
    const startDate = new Date("2022-04-15T00:00:00.000Z")
    const endDate = new Date("2023-04-15T00:00:00.000Z")
    expect(getDonationRange(startDate, endDate)).toEqual("2022-04-15 - 2023-04-15")
  })
})

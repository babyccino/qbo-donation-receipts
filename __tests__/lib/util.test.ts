import { formatDate, formatDateHtml, formatDateHtmlReverse, multipleClasses } from "@/lib/util"

describe("formatDate", () => {
  it("formats a date as dd/mm/yyyy", () => {
    expect(formatDate(new Date("2023/04/20"))).toEqual("20/4/2023")
    expect(formatDate(new Date("1995/10/05"))).toEqual("5/10/1995")
  })
})

describe("formatDateHtml", () => {
  it("formats a date as yyyy-mm-dd", () => {
    expect(formatDateHtml(new Date("2023/04/20"))).toEqual("20-4-2023")
    expect(formatDateHtml(new Date("1995/10/05"))).toEqual("5-10-1995")
  })
})

describe("formatDateHtmlReverse", () => {
  it("formats a date as yyyy-mm-dd", () => {
    expect(formatDateHtmlReverse(new Date("2023/04/20"))).toEqual("2023-4-20")
    expect(formatDateHtmlReverse(new Date("1995/10/05"))).toEqual("1995-10-5")
  })
})

describe("multipleClasses", () => {
  it("combines multiple class names into a single string", () => {
    expect(multipleClasses("foo", "bar", undefined, "", "baz")).toEqual("foo bar baz")
    expect(multipleClasses(undefined, "bar", "", "baz")).toEqual("bar baz")
  })
})

import { formatDate, formatDateHtml, formatDateHtmlReverse } from "@/lib/util/date"

describe("formatDate", () => {
  it("formats a date as dd/mm/yyyy", () => {
    expect(formatDate(new Date("2023/04/20"))).toEqual("20/04/2023")
    expect(formatDate(new Date("1995/10/05"))).toEqual("05/10/1995")
  })
})

describe("formatDateHtml", () => {
  it("formats a date as yyyy-mm-dd", () => {
    expect(formatDateHtml(new Date("2023/04/20"))).toEqual("20-04-2023")
    expect(formatDateHtml(new Date("1995/10/05"))).toEqual("05-10-1995")
  })
})

describe("formatDateHtmlReverse", () => {
  it("formats a date as yyyy-mm-dd", () => {
    expect(formatDateHtmlReverse(new Date("2023/04/20"))).toEqual("2023-04-20")
    expect(formatDateHtmlReverse(new Date("1995/10/05"))).toEqual("1995-10-05")
  })
})

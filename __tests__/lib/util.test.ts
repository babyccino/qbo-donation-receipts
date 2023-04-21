import {
  base64Encode,
  formatDate,
  formatDateHtml,
  multipleClasses,
  fetchJsonData,
} from "../../src/lib/util"

describe("base64Encode", () => {
  it("encodes a string to base64", () => {
    expect(base64Encode("hello world")).toEqual("aGVsbG8gd29ybGQ=")
    expect(base64Encode("foo bar baz")).toEqual("Zm9vIGJhciBiYXo=")
  })
})

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

describe("multipleClasses", () => {
  it("combines multiple class names into a single string", () => {
    expect(multipleClasses("foo", "bar", undefined, "", "baz")).toEqual("foo bar baz")
    expect(multipleClasses(undefined, "bar", "", "baz")).toEqual("bar baz")
  })
})

describe("fetchJsonData", () => {
  let mockFetch: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("fetches data successfully and returns it", async () => {
    const url = "https://example.com/data"
    const accessToken = "someAccessToken"
    const expectedData = { foo: "bar" }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(expectedData),
    } as unknown as Response)

    const result = await fetchJsonData(url, accessToken)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    })
    expect(result).toEqual(expectedData)
  })

  it("throws an error when the response is not ok", async () => {
    const url = "https://example.com/data"
    const accessToken = "someAccessToken"
    const errorData = { message: "Unauthorized" }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValueOnce(errorData),
    } as unknown as Response)

    await expect(fetchJsonData(url, accessToken)).rejects.toEqual({
      ...errorData,
      url,
    })
  })
})

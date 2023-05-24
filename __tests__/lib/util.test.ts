import {
  fetchJsonData,
  formatDate,
  formatDateHtml,
  formatDateHtmlReverse,
  multipleClasses,
  postJsonData,
} from "@/lib/util"

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

  it("posts data successfully and returns it", async () => {
    const url = "https://example.com/data"
    const postData = { foo: "foo" }
    const response = { bar: "bar" }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(response),
    } as unknown as Response)

    const result = await postJsonData(url, postData)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    })
    expect(result).toEqual(response)
  })

  it("throws an error when the response is not ok", async () => {
    const url = "https://example.com/data"
    const postData = { foo: "foo" }
    const errorData = { message: "Unauthorized" }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValueOnce(errorData),
    } as unknown as Response)

    await expect(postJsonData(url, postData)).rejects.toThrow()
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

  it("fetches data successfully and returns it without access token", async () => {
    const url = "https://example.com/data"
    const expectedData = { foo: "bar" }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(expectedData),
    } as unknown as Response)

    const result = await fetchJsonData(url)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(url, {
      headers: {
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

    await expect(fetchJsonData(url, accessToken)).rejects.toThrow()
  })
})

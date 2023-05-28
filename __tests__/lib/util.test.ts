import {
  base64EncodeString,
  fetchJsonData,
  formatDate,
  formatDateHtml,
  formatDateHtmlReverse,
  isJpegOrPngDataURL,
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

describe("base64EncodeString", () => {
  it("encodes a string to base64", () => {
    expect(base64EncodeString("hello world")).toEqual("aGVsbG8gd29ybGQ=")
    expect(base64EncodeString("foo bar baz")).toEqual("Zm9vIGJhciBiYXo=")
  })
})

describe("isJpegOrPngDataURL", () => {
  it("should return true for a valid JPEG data URL", () => {
    const dataURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD"
    expect(isJpegOrPngDataURL(dataURL)).toBe(true)
  })

  it("should return true for a valid PNG data URL", () => {
    const dataURL = "data:image/png;base64,iVBORw0KGg"
    expect(isJpegOrPngDataURL(dataURL)).toBe(true)
  })

  it("should return false for an invalid data URL", () => {
    const dataURL = "data:image/gif;base64,R0lGODlhAQ"
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })

  it("should return false for a non-base64 data URL", () => {
    const dataURL = "data:image/jpeg;url=https://example.com/image.jpg"
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })

  it("should return false for a non-JPEG/PNG data URL", () => {
    const dataURL = "data:image/gif;base64,R0lGODlhAQ..."
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })
})

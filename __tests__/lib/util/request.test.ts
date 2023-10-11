import { test, describe, expect, mock, afterEach } from "bun:test"

import { fetchJsonData, postJsonData } from "@/lib/util/request"

function mockGlobalFetch(arg: { ok: boolean; json: () => any; headers?: { get: () => string } }) {
  const mockFetch = mock((url: string, headers: any, body: string) => arg)
  global.fetch = mockFetch as any
  return mockFetch
}

describe("postJsonData", () => {
  const globalFetch = global.fetch
  afterEach(() => (global.fetch = globalFetch))

  test("posts data successfully and returns it", async () => {
    const url = "https://example.com/data"
    const postData = { foo: "foo" }
    const response = { bar: "bar" }

    const mockFetch = mockGlobalFetch({
      ok: true,
      json: () => response,
      headers: { get: () => "application/json" },
    })

    const result = await postJsonData(url, postData)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0]).toEqual([
      url,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      },
    ])
    expect(result).toEqual(response)
  })

  test("throws an error when the response is not ok", async () => {
    const url = "https://example.com/data"
    const postData = { foo: "foo" }
    const errorData = { message: "Unauthorized" }

    mockGlobalFetch({
      ok: false,
      json: () => errorData,
      headers: { get: () => "application/json" },
    })

    expect(postJsonData(url, postData)).rejects.toBeDefined()
  })
})

describe("fetchJsonData", () => {
  const globalFetch = global.fetch
  afterEach(() => (global.fetch = globalFetch))

  test("fetches data successfully and returns it", async () => {
    const url = "https://example.com/data"
    const accessToken = "someAccessToken"
    const expectedData = { foo: "bar" }

    const mockFetch = mockGlobalFetch({
      ok: true,
      headers: { get: () => "application/json" },
      json: () => expectedData,
    })

    const result = await fetchJsonData(url, accessToken)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0]).toEqual([
      url,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    ])
    expect(result).toEqual(expectedData)
  })

  test("fetches data successfully and returns it without access token", async () => {
    const url = "https://example.com/data"
    const expectedData = { foo: "bar" }

    const mockFetch = mockGlobalFetch({
      ok: true,
      headers: { get: () => "application/json" },
      json: () => expectedData,
    })

    const result = await fetchJsonData(url)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0]).toEqual([
      url,
      {
        headers: {
          Accept: "application/json",
        },
      },
    ])
    expect(result).toEqual(expectedData)
  })

  test("throws an error when the response is not ok", async () => {
    const url = "https://example.com/data"
    const accessToken = "someAccessToken"
    const errorData = { message: "Unauthorized" }

    mockGlobalFetch({
      ok: false,
      json: () => errorData,
    })

    expect(fetchJsonData(url, accessToken)).rejects.toBeDefined()
  })
})

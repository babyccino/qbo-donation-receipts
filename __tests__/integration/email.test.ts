import { test, describe, expect, beforeAll, afterAll } from "bun:test"
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"

import { createEmailHandler } from "@/pages/api/email"

const url = "https://example.com/resource"
export const handlers = [
  http.get(url, () => {
    return new HttpResponse("John")
  }),
]

const server = setupServer(...handlers)

describe("email", () => {
  beforeAll(() => {
    server.listen()
  })

  afterAll(() => {
    server.close()
  })

  test("should send email", async () => {
    const res = await fetch(url)
    const data = await res.text()
    expect(data).toEqual("John")
  })
})

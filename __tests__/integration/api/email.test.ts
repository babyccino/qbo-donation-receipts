import { test, describe, expect } from "bun:test"

import { createUser } from "../mocks"
import { makeQueryUrl } from "@/lib/qbo-api"

describe("email", () => {
  test("should send email", async () => {
    // const res = await fetch(makeQueryUrl("123456789", "select * from Item"))
    // const data = await res.text()
    // expect(data).toEqual("John")
  })

  test("should create user", async () => {
    // const user = await createUser()
    // expect(user.account.provider).toEqual("QBO")
  })
})

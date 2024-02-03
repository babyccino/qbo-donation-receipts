import { test, describe, expect, beforeAll } from "bun:test"

import { createUser } from "../setup"
import itemsHandler from "@/pages/api/items"

describe("items", () => {
  test("should send email", async () => {
    const { account, deleteAll, session, user } = await createUser()
    const res = await fetch(makeQueryUrl("123456789", "select * from Item"))
    const data = await res.text()
    expect(data).toEqual("John")
  })

  test("should create user", async () => {
    const user = await createUser()
    expect(user.account.provider).toEqual("QBO")
  })
})

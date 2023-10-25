import { beforeEach, describe, expect, test } from "bun:test"
import { NextApiRequest, NextApiResponse } from "next"
import { encode } from "next-auth/jwt"

import { config } from "@/lib/util/config"
import { createDateRange } from "@/lib/util/date"
import { createAuthorisedHandler } from "@/lib/util/request-server"
import { DataType, createHandler } from "@/api/items"
import { authOptions } from "../auth"
import { firestore, user, userCollection } from "../db"

const res = {
  getHeader: () => {},
  setHeader: () => res,
  status: () => res,
  end: () => {},
  json: () => {},
}
const userId = "testId"

describe("items api route", () => {
  beforeEach(async () => {
    await firestore.recursiveDelete(userCollection)
  })

  test("sets all fields of test user", async () => {
    const cookie = await encode({
      secret: config.nextauthJwtSecret,
      token: {
        accessToken: "accessToken",
        realmid: "1234",
        qboPermission: 0,
        id: userId,
        name: "John Smith",
        email: "test@test.com",
        realmId: "12345",
      },
    })
    const body: DataType = {
      dateRange: createDateRange("01-01-2022", "12-31-2022"),
      items: [1, 2, 3],
    }
    const request = {
      method: "POST",
      cookies: {
        "next-auth.session-token": cookie,
      },
      body: {
        ...body,
        dateRange: {
          startDate: body.dateRange.startDate.toISOString(),
          endDate: body.dateRange.endDate.toISOString(),
        },
      },
    }
    const handler = createAuthorisedHandler(authOptions, createHandler(user), ["POST"])
    const response = await handler(
      request as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    )

    const doc = await userCollection.doc(userId).get()
    const data = doc.data()
    expect(data).toBeDefined()
    if (!data) return
    expect(data).toEqual(body)
  })
})

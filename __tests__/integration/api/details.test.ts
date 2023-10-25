import { beforeEach, describe, expect, test } from "bun:test"
import { NextApiRequest, NextApiResponse } from "next"
import { encode } from "next-auth/jwt"

import { config } from "@/lib/util/config"
import { createAuthorisedHandler } from "@/lib/util/request-server"
import { DataType, createHandler } from "@/api/details"
import { authOptions } from "../auth"
import { fileStorage, firestore, user, userCollection } from "../db"

const res = {
  getHeader: () => {},
  setHeader: () => res,
  status: () => res,
  end: () => {},
  json: () => {},
}
const userId = "testId"

describe("details api route", () => {
  beforeEach(async () => {
    try {
      await firestore.recursiveDelete(userCollection)
    } catch {}
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
      companyAddress: "testCompanyAddress",
      companyName: "testCompanyName",
      country: "testCountry",
      registrationNumber: "123456789RR1234",
      signatoryName: "gus",
    }
    const request = {
      method: "POST",
      cookies: {
        "next-auth.session-token": cookie,
      },
      body,
    }
    const handler = createAuthorisedHandler(authOptions, createHandler(user, fileStorage), ["POST"])
    const response = await handler(
      request as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    )

    const doc = await userCollection.doc(userId).get()
    const data = doc.data()
    expect(data).toBeDefined()
    if (!data) return
    expect(data.donee).toEqual(body)
  })
})

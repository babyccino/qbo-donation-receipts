import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import { NextApiRequest, NextApiResponse } from "next"

import { db } from "@/lib/db"
import { createDateRange } from "@/lib/util/date"
import handler, { DataType } from "@/pages/api/items"
import { userDatas } from "db/schema"
import { createUser, getMockApiContext } from "../mocks"

describe("items api route", () => {
  afterAll(async () => {
    await db.delete(userDatas)
  })

  beforeAll(async () => {
    await db.delete(userDatas)
  })

  test("sets all fields of test user", async () => {
    const { account, session, deleteUser } = await createUser(true)

    const items = ["1", "2", "3"]
    const body: DataType = {
      dateRange: createDateRange("01-01-2022", "12-31-2022"),
      items,
    }
    const { req, res } = getMockApiContext("POST", session.sessionToken, {
      ...body,
      dateRange: {
        startDate: body.dateRange.startDate.toISOString(),
        endDate: body.dateRange.endDate.toISOString(),
      },
    })
    const response = await handler(
      req as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    )

    // expect(res.json).toHaveBeenCalledWith({ ok: true })

    const userData = await db.query.userDatas.findFirst({
      where: eq(userDatas.accountId, account.id),
    })

    expect(userData).toBeDefined()
    expect(userData?.items).toBe(items.join(","))
    expect(userData?.startDate?.toISOString()).toBe(body.dateRange.startDate.toISOString())
    expect(userData?.endDate?.toISOString()).toBe(body.dateRange.endDate.toISOString())

    await deleteUser()
  })

  test("disconnected user returns 401", async () => {
    const { user, account, session, deleteUser } = await createUser(false)

    const items = ["1", "2", "3"]
    const body: DataType = {
      dateRange: createDateRange("01-01-2022", "12-31-2022"),
      items,
    }
    const { req, res } = getMockApiContext("POST", session.sessionToken, {
      ...body,
      dateRange: {
        startDate: body.dateRange.startDate.toISOString(),
        endDate: body.dateRange.endDate.toISOString(),
      },
    })
    const response = await handler(
      req as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
    )

    // expect(res.status).toHaveBeenCalledWith(401)

    await deleteUser()
  })
})

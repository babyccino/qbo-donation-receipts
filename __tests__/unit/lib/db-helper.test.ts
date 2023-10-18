import { test, describe, expect } from "bun:test"

import { timestampToDate } from "@/lib/db/db-helper"
import { Timestamp } from "@google-cloud/firestore"

describe("timestampToDate", () => {
  test("should convert timestamps correctly for different types", () => {
    const firestoreResponse = {
      string: "string",
      number: 1,
      timestamp: new Timestamp(0, 0),
      array: [new Timestamp(1, 0)],
      obj: {
        string: "string",
        number: 1,
        timestamp: new Timestamp(2, 0),
        array: [new Timestamp(3, 0), new Timestamp(4, 0)],
      },
    }

    const res = timestampToDate(firestoreResponse)
    expect(res).toEqual({
      string: "string",
      number: 1,
      timestamp: new Date(0),
      array: [new Date(1000)],
      obj: {
        string: "string",
        number: 1,
        timestamp: new Date(2000),
        array: [new Date(3000), new Date(4000)],
      },
    })
  })
})

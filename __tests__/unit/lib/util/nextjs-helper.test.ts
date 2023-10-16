import { test, describe, expect } from "bun:test"

import {
  DeSerialiseDates,
  SerialiseDates,
  deSerialiseDates,
  serialiseDates,
} from "@/lib/util/nextjs-helper"
import { createDateRange } from "@/lib/util/date"

describe("serialiseDates", () => {
  test("should serialise an object correctly", () => {
    const obj = {
      string: "string",
      number: 1,
      timestamp: new Date(0),
      array: [new Date(1)],
      obj: {
        string: "string",
        number: 1,
        timestamp: new Date(2),
        array: [new Date(3), new Date(4)],
      },
    }

    const res = serialiseDates(obj)
    const expected = {
      string: "string",
      number: 1,
      timestamp: { __serialised_date__: 0 },
      array: [{ __serialised_date__: 1 }],
      obj: {
        string: "string",
        number: 1,
        timestamp: { __serialised_date__: 2 },
        array: [{ __serialised_date__: 3 }, { __serialised_date__: 4 }],
      },
    } satisfies SerialiseDates<typeof obj>
    expect(res).toEqual(expected)
  })

  test("failed real value should serialise correctly", () => {
    const obj = {
      dateRange: createDateRange("2023-01-01", "2023-12-31"),
      donations: [
        {
          address: "",
          email: "",
          id: 22,
          items: [{ id: 1, name: "hi", total: 100 }],
          name: "Jeff",
          total: 100,
        },
      ],
      notSent: [],
      timeStamp: new Date("2023-01-01"),
    }

    const res = serialiseDates(obj)
    const expected = {
      dateRange: {
        startDate: { __serialised_date__: new Date("2023-01-01").getTime() },
        endDate: { __serialised_date__: new Date("2023-12-31").getTime() },
      },
      donations: [
        {
          address: "",
          email: "",
          id: 22,
          items: [{ id: 1, name: "hi", total: 100 }],
          name: "Jeff",
          total: 100,
        },
      ],
      notSent: [],
      timeStamp: { __serialised_date__: new Date("2023-01-01").getTime() },
    } satisfies SerialiseDates<typeof obj>
    expect(res).toEqual(expected)
  })
})

describe("deSerialiseDates", () => {
  test("should de-serialise an object correctly", () => {
    const obj = {
      string: "string",
      number: 1,
      timestamp: { __serialised_date__: 0 },
      array: [{ __serialised_date__: 1 }],
      obj: {
        string: "string",
        number: 1,
        timestamp: { __serialised_date__: 2 },
        array: [{ __serialised_date__: 3 }, { __serialised_date__: 4 }],
      },
    }

    const res = deSerialiseDates(obj)
    const expected = {
      string: "string",
      number: 1,
      timestamp: new Date(0),
      array: [new Date(1)],
      obj: {
        string: "string",
        number: 1,
        timestamp: new Date(2),
        array: [new Date(3), new Date(4)],
      },
    } satisfies DeSerialiseDates<typeof res>
    expect(res).toEqual(expected)
  })
})

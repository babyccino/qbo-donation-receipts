import {
  DeSerialiseDates,
  SerialiseDates,
  deSerialiseDates,
  serialiseDates,
} from "@/lib/util/nextjs-helper"

describe("serialiseDates", () => {
  const originalObj = it("should serialise an object correctly", () => {
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
})

describe("deSerialiseDates", () => {
  it("should de-serialise an object correctly", () => {
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

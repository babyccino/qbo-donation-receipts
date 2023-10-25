import { test, describe, expect } from "bun:test"

import { checkUserDataCompletion, isUserDataComplete, timestampToDate } from "@/lib/db/db-helper"
import { Timestamp } from "@google-cloud/firestore"
import { User } from "@/types/db"
import { createDateRange } from "@/lib/util/date"

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

describe("isUserDataComplete function", () => {
  test("should return true when all fields are complete", () => {
    const completeUserData: User = {
      items: [1],
      donee: {
        companyAddress: "123 Main St",
        companyName: "Example Company",
        country: "USA",
        registrationNumber: "123456",
        signatoryName: "John Doe",
        signature: "base64encodedimage",
        smallLogo: "base64encodedimage",
      },
      dateRange: createDateRange("2023-01-01", "2023-12-31"),
      email: "test@test.com",
      connected: true,
      id: "123",
      name: "Jeff",
    }

    expect(isUserDataComplete(completeUserData)).toBe(true)
  })

  test('should return false when "items" field is missing', () => {
    const incompleteUserData: User = {
      donee: {
        companyAddress: "123 Main St",
        companyName: "Example Company",
        country: "USA",
        registrationNumber: "123456",
        signatoryName: "John Doe",
        signature: "base64encodedimage",
        smallLogo: "base64encodedimage",
      },
      dateRange: createDateRange("2023-01-01", "2023-12-31"),
      email: "test@test.com",
      connected: true,
      id: "123",
      name: "Jeff",
    }

    expect(isUserDataComplete(incompleteUserData)).toBe(false)
  })
})

describe("checkUserDataCompletion function", () => {
  test("should return complete items and doneeDetails as true when all fields are complete", () => {
    const completeUserData: User = {
      items: [
        /* your item data here */
      ],
      donee: {
        companyAddress: "123 Main St",
        companyName: "Example Company",
        country: "USA",
        registrationNumber: "123456",
        signatoryName: "John Doe",
        signature: "base64encodedimage",
        smallLogo: "base64encodedimage",
      },
      dateRange: createDateRange("2023-01-01", "2023-12-31"),
      email: "test@test.com",
      connected: true,
      id: "123",
      name: "Jeff",
    }

    const result = checkUserDataCompletion(completeUserData)

    expect(result.items).toBe(true)
    expect(result.doneeDetails).toBe(true)
  })

  test('should return complete items and doneeDetails as false when "donee" is missing', () => {
    const incompleteUserData: User = {
      items: [1],
      dateRange: createDateRange("2023-01-01", "2023-12-31"),
      email: "test@test.com",
      connected: true,
      id: "123",
      name: "Jeff",
    }

    const result = checkUserDataCompletion(incompleteUserData)

    expect(result.items).toBe(true)
    expect(result.doneeDetails).toBe(false)
  })

  test('should return complete items and doneeDetails as false when "items" is missing', () => {
    const incompleteUserData: User = {
      donee: {
        companyAddress: "123 Main St",
        companyName: "Example Company",
        country: "USA",
        registrationNumber: "123456",
        signatoryName: "John Doe",
        signature: "base64encodedimage",
        smallLogo: "base64encodedimage",
      },
      dateRange: createDateRange("2023-01-01", "2023-12-31"),
      email: "test@test.com",
      connected: true,
      id: "123",
      name: "Jeff",
    }

    const result = checkUserDataCompletion(incompleteUserData)

    expect(result.items).toBe(false)
    expect(result.doneeDetails).toBe(true)
  })
})

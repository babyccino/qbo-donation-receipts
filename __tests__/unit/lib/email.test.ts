import { describe, expect, test } from "bun:test"

import { formatEmailBody, trimHistory } from "@/lib/email"
import { createDateRange } from "@/lib/util/date"
import { DeepPartial } from "@/lib/util/etc"
import { EmailHistoryItem } from "@/types/db"

describe("formatEmailBody function", () => {
  test("should replace templateDonorName with the provided donorName", () => {
    const emailTemplate = "Hello, FULL_NAME! Thank you for your donation."
    const donorName = "John Doe"

    const formattedBody = formatEmailBody(emailTemplate, donorName)

    const expectedBody = `Hello, ${donorName}! Thank you for your donation.`

    expect(formattedBody).toBe(expectedBody)
  })

  test("should replace multiple occurrences of templateDonorName", () => {
    const emailTemplate = "Dear FULL_NAME, We appreciate your support, FULL_NAME."
    const donorName = "Jane Smith"

    const formattedBody = formatEmailBody(emailTemplate, donorName)

    const expectedBody = "Dear Jane Smith, We appreciate your support, Jane Smith."

    expect(formattedBody).toBe(expectedBody)
  })

  test("should handle an empty email body", () => {
    const emailTemplate = ""
    const donorName = "John Doe"

    const formattedBody = formatEmailBody(emailTemplate, donorName)

    expect(formattedBody).toBe("")
  })

  test("should handle an empty donorName", () => {
    const emailTemplate = "Hello, FULL_NAME!"
    const donorName = ""

    const formattedBody = formatEmailBody(emailTemplate, donorName)

    const expectedBody = "Hello, !"

    expect(formattedBody).toBe(expectedBody)
  })

  test("should handle no replacements if templateDonorName is not found", () => {
    const emailTemplate = "Thank you for your donation."
    const donorName = "John Doe"

    const formattedBody = formatEmailBody(emailTemplate, donorName)

    expect(formattedBody).toBe(emailTemplate)
  })
})

describe("trimHistory", () => {
  const emailHistory: DeepPartial<EmailHistoryItem>[] = [
    {
      dateRange: { startDate: new Date("2023-01-01"), endDate: new Date("2023-12-31") },
      donations: [{ id: 1 }, { id: 2 }],
    },
    {
      dateRange: { startDate: new Date("2022-07-01"), endDate: new Date("2023-06-30") },
      donations: [{ id: 1 }, { id: 3 }, { id: 4 }, { id: 5 }],
    },
    {
      dateRange: { startDate: new Date("2022-01-01"), endDate: new Date("2022-12-31") },
      donations: [{ id: 2 }, { id: 3 }],
    },
  ]
  const dateRange = createDateRange("2023-01-01", "2023-12-31")
  const recipientIds = new Set([1, 3, 4])

  test("returns relevant email history for user with matching date range and donations", () => {
    const result = trimHistory(recipientIds, emailHistory as EmailHistoryItem[], dateRange)
    expect(result).toEqual([
      {
        dateRange: { startDate: new Date("2023-01-01"), endDate: new Date("2023-12-31") },
        donations: [{ id: 1 }],
      },
      {
        dateRange: { startDate: new Date("2022-07-01"), endDate: new Date("2023-06-30") },
        donations: [{ id: 1 }, { id: 3 }, { id: 4 }],
      },
    ])
  })

  test("returns null when there is no relevant email history", () => {
    const result = trimHistory(recipientIds, [], dateRange)
    expect(result).toBeNull()
  })

  test("returns null when no matching donations are found", () => {
    const nonMatchingDonors = new Set([3, 4, 5])
    const nonOverlappingDateRange = createDateRange("2023-07-31", "2023-12-31")
    const result = trimHistory(
      nonMatchingDonors,
      emailHistory as EmailHistoryItem[],
      nonOverlappingDateRange,
    )
    expect(result).toBeNull()
  })
})

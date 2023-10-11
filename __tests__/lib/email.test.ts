import { describe, expect, test } from "bun:test"

import { trimHistoryByIdAndDateRange } from "@/lib/email"
import { createDateRange } from "@/lib/util/date"
import { DeepPartial } from "@/lib/util/etc"
import { EmailHistoryItem } from "@/types/db"

describe("trimHistoryByIdAndDateRange", () => {
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
    const result = trimHistoryByIdAndDateRange(
      recipientIds,
      dateRange,
      emailHistory as EmailHistoryItem[],
    )
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
    const result = trimHistoryByIdAndDateRange(recipientIds, dateRange, [])
    expect(result).toBeNull()
  })

  test("returns null when no matching donations are found", () => {
    const nonMatchingDonors = new Set([3, 4, 5])
    const nonOverlappingDateRange = createDateRange("2023-07-31", "2023-12-31")
    const result = trimHistoryByIdAndDateRange(
      nonMatchingDonors,
      nonOverlappingDateRange,
      emailHistory as EmailHistoryItem[],
    )
    expect(result).toBeNull()
  })
})

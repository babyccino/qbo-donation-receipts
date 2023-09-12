import { test, describe, expect } from "bun:test"

import { DeepPartial } from "@/lib/util/etc"
import { getEmailHistory } from "@/lib/email"
import { UserDataComplete } from "@/lib/db-helper"
import { EmailHistoryItem, User } from "@/types/db"
import { Donation } from "@/types/qbo-api"

describe("getEmailHistory", () => {
  const user: DeepPartial<User> = {
    emailHistory: [
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
    ],
    dateRange: { startDate: new Date("2023-01-01"), endDate: new Date("2023-12-31") },
  }

  const donations = [{ id: 1 }, { id: 3 }, { id: 4 }]

  test("returns relevant email history for user with matching date range and donations", () => {
    const result = getEmailHistory(user as UserDataComplete, donations as Donation[])
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
    const noEmailHistoryUser = { ...user, emailHistory: undefined }
    const result = getEmailHistory(noEmailHistoryUser as UserDataComplete, donations as Donation[])
    expect(result).toBeNull()
  })

  test("returns null when no matching donations are found", () => {
    const noMatchingDonations = [{ id: 5 }, { id: 6 }]
    const result = getEmailHistory(user as UserDataComplete, noMatchingDonations as Donation[])
    expect(result).toBeNull()
  })
})

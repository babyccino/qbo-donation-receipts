import { Donation } from "@/types/qbo-api"
import { DoneeInfo } from "db/schema"

export type EmailProps = {
  donation: Donation
  receiptNo: number
  donee: Omit<DoneeInfo, "accountId" | "createdAt" | "id" | "updatedAt">
  currentDate: Date
  donationDate: Date
  currency: string
}
export type WithBodyProps = EmailProps & { body: string }

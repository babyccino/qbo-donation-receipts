import { DoneeInfo } from "@/types/db"
import { Donation } from "@/types/qbo-api"

export type EmailProps = {
  donation: Donation
  receiptNo: number
  donee: DoneeInfo
  currentDate: Date
  donationDate: Date
  currency: string
}
export type WithBodyProps = EmailProps & { body: string }

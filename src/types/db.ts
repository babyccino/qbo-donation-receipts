import { DateRange } from "@/lib/util/date"
import { CompanyInfo, Donation } from "@/types/qbo-api"
import Stripe from "stripe"

export type DoneeInfo = {
  signature: string | null
  smallLogo: string | null
  companyName: string
  companyAddress: string
  country: string
  registrationNumber: string | null
  signatoryName: string | null
  id: string
  userId: string
  largeLogo: string | null
  createdAt: Date
  updatedAt: Date
}

export type DateToTimestamp<T> = T extends Date
  ? number
  : T extends object
  ? {
      [K in keyof T]: DateToTimestamp<T[K]>
    }
  : T

export type User = {
  emailVerified: Date | null
  image: string | null
  id: string
  qboId: string | null
  name: string | null
  email: string
  connected: boolean | null
  realmId: string | null
  createdAt: Date
  updatedAt: Date
}

type BillingAddress = {
  phone: string
  address: Stripe.Address
  name: string
}

type DonationWithEmail = Donation & { email: string }
type NotSent = Pick<Donation, "name" | "id">
export type EmailHistoryItem = {
  timeStamp: Date
  dateRange: DateRange
  donations: DonationWithEmail[]
  notSent: NotSent[]
}

export type Subscription = {
  id: string
  status?: Stripe.Subscription.Status
  metadata?: Stripe.Metadata
  cancelAtPeriodEnd?: boolean
  created: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  endedAt?: Date
  cancelAt?: Date
  canceledAt?: Date
}

export type Product = {
  id: string
  active?: boolean
  name?: string
  metadata?: Stripe.Metadata
}

export type Price = {
  id: string
  active?: boolean
  unitAmount?: number
  currency?: string
  type?: Stripe.Price.Type
  interval?: Stripe.Price.Recurring.Interval
  intervalCount?: number
  metadata?: Stripe.Metadata
}

import { DateRange } from "@/lib/util/date"
import { CompanyInfo, Donation } from "@/types/qbo-api"
import Stripe from "stripe"

export type DoneeInfo = CompanyInfo & {
  registrationNumber?: string
  signatoryName?: string
  signature?: string
  smallLogo?: string
  largeLogo?: string
}

export type User = {
  email: string
  id: string
  name: string
  connected: boolean
  realmId?: string
  items?: number[]
  dateRange?: DateRange
  emailHistory?: EmailHistoryItem[]
  donee?: DoneeInfo
  subscription?: Subscription
  billingAddress?: BillingAddress
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

import { CompanyInfo } from "@/types/qbo-api"
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
  realmId: string
  items?: number[]
  date?: {
    startDate: Date
    endDate: Date
  }
  donee?: DoneeInfo
  subscription?: Subscription
  billingAddress?: BillingAddress
}

type BillingAddress = {
  phone: string
  address: Stripe.Address
  name: string
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

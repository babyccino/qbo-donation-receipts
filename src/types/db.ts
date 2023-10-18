import { DateRange } from "@/lib/util/date"
import { CompanyInfo, Donation } from "@/types/qbo-api"
import { WhereFilterOp } from "firebase-admin/firestore"
import Stripe from "stripe"

type UploadOptions = {
  contentType?: "image/webp" | "image/jpeg" | "image/jpg" | "image/png"
  publicUrl?: boolean
}
export interface FileStorage {
  saveFile(
    id: string,
    fileName: string,
    data: Buffer | string,
    opts?: UploadOptions,
  ): Promise<string>
  downloadFileBase64(id: string, fileName: string): Promise<string>
  downloadFileBase64DataUrl(id: string, fileName: string): Promise<string>
  downloadFileBuffer(id: string, fileName: string): Promise<Buffer>
}

type ArrayFields<T> = {
  [K in keyof T as Required<T>[K] extends Array<any> ? K : never]: T[K]
}

// Collections

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
type PartialUser = Omit<
  Partial<User>,
  "dateRange" | "donee" | "subscription" | "billingAddress"
> & {
  dateRange?: Partial<DateRange>
  donee?: Partial<DoneeInfo>
  subscription?: Partial<Subscription>
  billingAddress?: Partial<BillingAddress>
}

interface Collection<T> {
  get(id: string): Promise<T | undefined>
  getOrThrow(id: string): Promise<T>
  set(id: string, data: Partial<T>): Promise<void>
  delete(id: string): Promise<void>
}
export interface UserData extends Collection<User> {
  set(id: string, data: PartialUser): Promise<void>
  queryFirst<T extends keyof User>(
    param: T,
    op: WhereFilterOp,
    value: User[T],
  ): Promise<User | undefined>
  append(id: string, data: ArrayFields<PartialUser>): Promise<void>
}
type hi = PartialUser["billingAddress"]

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
export interface ProudctData extends Collection<Product> {}

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
export interface PriceData extends Collection<Price> {}

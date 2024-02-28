import { relations, sql } from "drizzle-orm"
import { customType, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { ProviderType } from "next-auth/providers"
import type { Stripe } from "stripe"

import { EmailStatus } from "@/types/resend"

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(strftime('%s', 'now') as int) * 1000)`)
    .notNull()

function stringEnum<TData extends string>(name: string) {
  return customType<{
    data: TData
    driverData: string
  }>({
    dataType: config => "text",
  })(name)
}

const metadata = customType<{
  data: Stripe.Metadata
  driverData: string
}>({
  dataType: () => "text",
  fromDriver: value => JSON.parse(value) as Stripe.Metadata,
  toDriver: value => JSON.stringify(value),
})

export const users = sqliteTable(
  "users",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    name: text("name", { length: 191 }),
    email: text("email", { length: 191 }).notNull(),
    emailVerified: timestamp("emailVerified"),
    image: text("image", { length: 191 }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  user => ({
    emailIndex: uniqueIndex("users__email__idx").on(user.email),
  }),
)
export type User = typeof users.$inferSelect

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  subscription: one(subscriptions),
  billingAddress: one(billingAddresses),
  supportTickets: many(supportTickets),
}))

export const supportTickets = sqliteTable(
  "support_tickets",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    userId: text("user_id", { length: 191 }).notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    from: text("from").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  supportTicket => ({
    userIdIndex: index("support_tickets__user_id__idx").on(supportTicket.userId),
  }),
)
export type SupportTicket = typeof supportTickets.$inferSelect

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
}))

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    userId: text("user_id", { length: 191 }).notNull(),
    status: stringEnum<Stripe.Subscription.Status>("status"),
    metadata: metadata("metadata"),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }),
    currentPeriodStart: integer("current_period_start", { mode: "timestamp_ms" }).notNull(),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    cancelAt: integer("cancel_at", { mode: "timestamp_ms" }),
    canceledAt: integer("canceled_at", { mode: "timestamp_ms" }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  subscription => ({
    userIdIndex: uniqueIndex("subscriptions__user_id__idx").on(subscription.userId),
  }),
)
export type Subscription = typeof subscriptions.$inferSelect

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}))

export const billingAddresses = sqliteTable(
  "billing_addresses",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    userId: text("user_id", { length: 191 }).notNull(),
    name: text("name"),
    phone: text("phone"),
    city: text("city"),
    country: text("country"),
    line1: text("line1"),
    line2: text("line2"),
    postalCode: text("postal_code"),
    state: text("state"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  billingAddress => ({
    userIdIndex: uniqueIndex("billing_addresses__user_id__idx").on(billingAddress.userId),
  }),
)
export type BillingAddress = typeof billingAddresses.$inferSelect

export const billingAddressesRelations = relations(billingAddresses, ({ one }) => ({
  user: one(users, {
    fields: [billingAddresses.userId],
    references: [users.id],
  }),
}))

export type BillingAddress2 = {
  phone: string
  address: Stripe.Address
  name: string
}

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    userId: text("user_id", { length: 191 }).notNull(),
    type: stringEnum<ProviderType>("type").notNull(),
    provider: text("provider", { length: 191 }).notNull(),
    providerAccountId: text("provider_account_id", { length: 191 }).notNull(),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    idToken: text("id_token"),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: stringEnum<"accounting" | "profile">("scope"),
    tokenType: text("token_type", { length: 191 }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    realmId: text("realmid"),
    companyName: text("company_name"),
  },
  account => ({
    userIdRealmIdIndex: uniqueIndex("accounts__user_id__realmid__idx").on(
      account.userId,
      account.realmId,
    ),
    userIdIndex: index("accounts__userId__idx").on(account.userId),
  }),
)
export type Account = typeof accounts.$inferSelect

export const accountsRelations = relations(accounts, ({ many, one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  userData: one(userDatas),
  doneeInfo: one(doneeInfos),
  campaigns: many(campaigns),
}))

export const userDatas = sqliteTable(
  "user_datas",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    accountId: text("account_id", { length: 191 }).notNull(),
    items: text("items"),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  userData => ({
    accountIdIndex: uniqueIndex("user_data__account_id__idx").on(userData.accountId),
  }),
)
export type UserDatas = typeof userDatas.$inferSelect

export const userDatasRelations = relations(userDatas, ({ one }) => ({
  account: one(accounts, {
    fields: [userDatas.accountId],
    references: [accounts.id],
  }),
}))

export const doneeInfos = sqliteTable(
  "donee_infos",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    accountId: text("account_id", { length: 191 }).notNull(),
    companyName: text("company_name").notNull(),
    companyAddress: text("company_address").notNull(),
    country: text("country").notNull(),
    registrationNumber: text("registration_number").notNull(),
    signatoryName: text("signatory_name").notNull(),
    signature: text("signature").notNull(),
    smallLogo: text("small_logo").notNull(),
    largeLogo: text("large_logo").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  doneeInfo => ({
    accountIdIndex: uniqueIndex("donee_infos__account_id__idx").on(doneeInfo.accountId),
  }),
)
export type DoneeInfo = typeof doneeInfos.$inferSelect

export const doneeInfosRelations = relations(doneeInfos, ({ one }) => ({
  account: one(accounts, {
    fields: [doneeInfos.accountId],
    references: [accounts.id],
  }),
}))

export const campaigns = sqliteTable(
  "campaigns",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    accountId: text("account_id", { length: 191 }).notNull(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: timestamp("created_at"),
  },
  campaign => ({
    accountIndex: index("campaigns__account_id__idx").on(campaign.accountId),
  }),
)
export type Campaign = typeof campaigns.$inferSelect

export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  account: one(accounts, {
    fields: [campaigns.accountId],
    references: [accounts.id],
  }),
  receipts: many(receipts),
}))

export const receipts = sqliteTable(
  "receipts",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    emailId: text("email_id", { length: 191 }),
    campaignId: text("campaign_id", { length: 191 }).notNull(),
    emailStatus: stringEnum<EmailStatus>("email_status").notNull(),
    donorId: text("donor_id", { length: 191 }).notNull(),
    total: integer("total", { mode: "number" }).notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at"),
  },
  receipt => ({
    emailIdIndex: uniqueIndex("receipts__email_id__idx").on(receipt.emailId),
    campaignIndex: index("receipts__campaign_id__idx").on(receipt.campaignId),
    campaignEmailIndex: uniqueIndex("receipts__campaign_id__email__idx").on(receipt.campaignId),
  }),
)
export type Receipt = typeof receipts.$inferSelect

export const receiptsRelations = relations(receipts, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [receipts.campaignId],
    references: [campaigns.id],
  }),
}))

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    sessionToken: text("session_token", { length: 191 }).notNull(),
    userId: text("user_id", { length: 191 }).notNull(),
    accountId: text("account_id", { length: 191 }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  session => ({
    sessionTokenIndex: uniqueIndex("sessions__sessionToken__idx").on(session.sessionToken),
    userIdIndex: index("sessions__userId__idx").on(session.userId),
  }),
)
export type Session = typeof sessions.$inferSelect

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [sessions.accountId],
    references: [accounts.id],
  }),
}))

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier", { length: 191 }).primaryKey().notNull(),
    token: text("token", { length: 191 }).notNull(),
    expires: integer("expires").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  verificationToken => ({
    tokenIndex: uniqueIndex("verification_tokens__token__idx").on(verificationToken.token),
  }),
)
export type VerificationToken = typeof verificationTokens.$inferSelect

export const products = sqliteTable("verification_tokens", {
  id: text("id", { length: 191 }).primaryKey().notNull(),
  active: integer("active", { mode: "boolean" }),
  name: text("name"),
  metadata: metadata("metadata"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
})
export type Product = typeof products.$inferSelect

export const prices = sqliteTable("verification_tokens", {
  id: text("id", { length: 191 }).primaryKey().notNull(),
  active: integer("active", { mode: "boolean" }),
  unitAmount: integer("unit_amount"),
  currency: text("currency"),
  type: stringEnum<Stripe.Price.Type>("type"),
  interval: stringEnum<Stripe.Price.Recurring.Interval>("interval"),
  intervalCount: integer("interval_count"),
  metadata: metadata("metadata"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
})
export type Price = typeof prices.$inferSelect

export type Schema = {
  users: typeof users
  usersRelations: typeof usersRelations
  subscriptions: typeof subscriptions
  subscriptionsRelations: typeof subscriptionsRelations
  billingAddresses: typeof billingAddresses
  billingAddressesRelations: typeof billingAddressesRelations
  accounts: typeof accounts
  accountsRelations: typeof accountsRelations
  userDatas: typeof userDatas
  userDatasRelations: typeof userDatasRelations
  doneeInfos: typeof doneeInfos
  doneeInfosRelations: typeof doneeInfosRelations
  campaigns: typeof campaigns
  campaignsRelations: typeof campaignsRelations
  receipts: typeof receipts
  receiptsRelations: typeof receiptsRelations
  sessions: typeof sessions
  sessionsRelations: typeof sessionsRelations
  verificationTokens: typeof verificationTokens
  products: typeof products
  prices: typeof prices
}

import { relations, sql } from "drizzle-orm"
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import type { Stripe } from "stripe"

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(strftime('%s', 'now') as int) * 1000)`)
    .notNull()

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

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}))

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    userId: text("user_id", { length: 191 }).notNull(),
    type: text("type", { length: 191 }).notNull(),
    provider: text("provider", { length: 191 }).notNull(),
    providerAccountId: text("provider_account_id", { length: 191 }).notNull(),
    accessToken: text("access_token").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    idToken: text("id_token"),
    refreshToken: text("refresh_token").notNull(),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }).notNull(),
    scope: text("scope", { length: 191 }),
    tokenType: text("token_type", { length: 191 }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    realmId: text("realmid"),
  },
  account => ({
    providerProviderAccountIdIndex: uniqueIndex("accounts__provider__providerAccountId__idx").on(
      account.provider,
      account.providerAccountId,
    ),
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
  emailHistories: many(emailHistories),
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

export const emailHistories = sqliteTable(
  "email_histories",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    accountId: text("account_id", { length: 191 }).notNull(),
    startDate: integer("start_date", { mode: "timestamp_ms" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp_ms" }).notNull(),
    createdAt: timestamp("created_at"),
  },
  emailHistory => ({
    accountIndex: index("email_histories__account_id__idx").on(emailHistory.accountId),
  }),
)
export type EmailHistory = typeof emailHistories.$inferSelect

export const emailHistoriesRelations = relations(emailHistories, ({ many, one }) => ({
  account: one(accounts, {
    fields: [emailHistories.accountId],
    references: [accounts.id],
  }),
  donations: many(donations),
}))

export const donations = sqliteTable(
  "donations",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    emailHistoryId: text("email_history_id", { length: 191 }).notNull(),
    donorId: text("id", { length: 191 }).notNull(),
    total: integer("total", { mode: "number" }).notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at"),
  },
  donation => ({
    emailHistoryIndex: uniqueIndex("donations__email_history_id__idx").on(donation.emailHistoryId),
  }),
)
export type Donation = typeof donations.$inferSelect

export const donationsRelations = relations(donations, ({ one }) => ({
  emailHistory: one(emailHistories, {
    fields: [donations.donorId],
    references: [emailHistories.id],
  }),
}))

export type Session = typeof sessions.$inferSelect
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id", { length: 191 }).primaryKey().notNull(),
    sessionToken: text("sessionToken", { length: 191 }).notNull(),
    userId: text("userId", { length: 191 }).notNull(),
    expires: integer("expires").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  session => ({
    sessionTokenIndex: uniqueIndex("sessions__sessionToken__idx").on(session.sessionToken),
    userIdIndex: index("sessions__userId__idx").on(session.userId),
  }),
)

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

// TODO models still to migrate:

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

export type BillingAddress = {
  phone: string
  address: Stripe.Address
  name: string
}

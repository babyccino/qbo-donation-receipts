import { db } from "@/lib/db"
import { config } from "@/lib/util/config"
import { createId } from "@paralleldrive/cuid2"
import {
  accounts,
  sessions,
  users,
  donations,
  doneeInfos,
  userDatas,
  emailHistories,
  products,
  prices,
  billingAddresses,
  subscriptions,
  supportTickets,
  verificationTokens,
} from "db/schema"
import { oneHrFromNow } from "@/lib/util/date"
import { eq } from "drizzle-orm"
import { beforeAll, afterAll } from "bun:test"
import { http, HttpResponse } from "msw"
import { SetupServer, setupServer } from "msw/node"
import { makeQueryUrl } from "@/lib/qbo-api"

const testRealmId = "123456789"

const deleteAll = () =>
  Promise.all([
    db.delete(sessions),
    db.delete(users),
    db.delete(accounts),
    db.delete(donations),
    db.delete(doneeInfos),
    db.delete(userDatas),
    db.delete(emailHistories),
    db.delete(products),
    db.delete(prices),
    db.delete(billingAddresses),
    db.delete(subscriptions),
    db.delete(supportTickets),
    db.delete(verificationTokens),
  ])

let server: SetupServer

beforeAll(async () => {
  await deleteAll()

  const url = makeQueryUrl(testRealmId, "select * from Item")
  const handlers = [
    http.get(url, () => {
      return HttpResponse.json()
    }),
  ]

  server = setupServer(...handlers)

  server.listen()
  // Create a user
})

afterAll(async () => {
  server?.close()
  await deleteAll()
})

if (config.nodeEnv !== "test") {
  throw new Error("This test can only be run in test mode")
}

export async function createUser() {
  const userId = createId()
  const accountId = createId()
  const sessionToken = createId()
  const sessionPromise = db
    .insert(sessions)
    .values({
      id: createId(),
      expires: oneHrFromNow(),
      sessionToken,
      accountId,
      userId,
    })
    .returning()
  const userPromise = db
    .insert(users)
    .values({
      id: userId,
      email: Math.round(Math.random() * 10) + "@gmail.com",
      name: "Test User",
    })
    .returning()
  const accountPromise = db
    .insert(accounts)
    .values({
      id: accountId,
      provider: "QBO",
      providerAccountId: "QBO",
      type: "oauth",
      userId: userId,
      accessToken: "access-token",
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: oneHrFromNow(),
      companyName: "Test Company",
      scope: "accounting",
      realmId: testRealmId,
      expiresAt: oneHrFromNow(),
    })
    .returning()
  const [sessionRes, userRes, accountRes] = await Promise.all([
    sessionPromise,
    userPromise,
    accountPromise,
  ])
  if (sessionRes.length !== 1) throw new Error("Expected 1 session to be created")
  if (userRes.length !== 1) throw new Error("Expected 1 user to be created")
  if (accountRes.length !== 1) throw new Error("Expected 1 account to be created")

  const deleteAll = async () => {
    await Promise.all([
      db.delete(sessions).where(eq(sessions.userId, userId)),
      db.delete(users).where(eq(users.id, userId)),
      db.delete(accounts).where(eq(accounts.id, accountId)),
    ])
  }

  return { user: userRes[0], session: sessionRes[0], account: accountRes[0], deleteAll }
}

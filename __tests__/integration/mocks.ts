import { createId } from "@paralleldrive/cuid2"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { oneHrFromNow } from "@/lib/util/date"
import { ItemQueryResponse, ItemQueryResponseItem } from "@/types/qbo-api"
import {
  accounts,
  billingAddresses,
  donations,
  doneeInfos,
  emailHistories,
  prices,
  products,
  sessions,
  subscriptions,
  supportTickets,
  userDatas,
  users,
  verificationTokens,
} from "db/schema"

type ResMock = {
  getHeader: () => void
  setHeader: () => ResMock
  status: (statusCode: number) => ResMock
  end: () => void
  json: (json: any) => void
}
export function getMockApiContext(
  method: "GET" | "POST",
  sessionToken: string,
  body: any | undefined,
) {
  const req = {
    method,
    cookies: {
      "next-auth.session-token": sessionToken,
    },
    body,
  }
  const res: ResMock = {
    getHeader: () => {},
    setHeader: () => res,
    status: (statusCode: number) => res,
    end: () => {},
    json: (json: any) => {},
  }
  return { req, res }
}

export async function createUser(connected: boolean) {
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
      email: Math.round(Math.random() * 15) + "@gmail.com",
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
      scope: connected ? "accounting" : "profile",
      realmId: connected ? testRealmId : null,
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

  const deleteUser = async () => {
    await Promise.all([
      db.delete(sessions).where(eq(sessions.userId, userId)),
      db.delete(users).where(eq(users.id, userId)),
      db.delete(accounts).where(eq(accounts.id, accountId)),
    ])
  }

  return { user: userRes[0], session: sessionRes[0], account: accountRes[0], deleteUser }
}

export const testRealmId = "123456789"
const date = new Date("2022-01-01")
const itemQueryResponseShared: Omit<
  ItemQueryResponseItem,
  "Id" | "Name" | "FullyQualifiedName" | "PurchaseCost" | "UnitPrice"
> = {
  Active: true,
  Description: "This item does things",
  domain: "domain",
  IncomeAccountRef: { name: "income", value: "1" },
  MetaData: { CreateTime: date.toISOString(), LastUpdatedTime: date.toISOString() },
  sparse: true,
  SyncToken: "123",
  Taxable: true,
  TrackQtyOnHand: false,
  Type: "item",
}
export const mockItemQueryResponse: ItemQueryResponse = {
  QueryResponse: {
    maxResults: 3,
    startPosition: 0,
    Item: [
      {
        Id: "1",
        Name: "General Donations",
        FullyQualifiedName: "General Donations",
        PurchaseCost: 100,
        UnitPrice: 100,
        ...itemQueryResponseShared,
      },
      {
        Id: "2",
        Name: "A Donations",
        FullyQualifiedName: "A Donations",
        PurchaseCost: 100,
        UnitPrice: 100,
        ...itemQueryResponseShared,
      },
      {
        Id: "3",
        Name: "B Donations",
        FullyQualifiedName: "B Donations",
        PurchaseCost: 100,
        UnitPrice: 100,
        ...itemQueryResponseShared,
      },
    ],
  },
  time: date.toISOString(),
}

export const deleteAll = () =>
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

export const mockDoneeInfo = (accountId: string) => ({
  id: createId(),
  accountId,
  companyAddress: "123 Fake St",
  companyName: "Apple Co",
  country: "Canada",
  largeLogo: "https://images.com/logo.png",
  smallLogo: "https://images.com/logo.png",
  registrationNumber: "123",
  signatoryName: "John Smith",
  signature: "https://images.com/signature.png",
})

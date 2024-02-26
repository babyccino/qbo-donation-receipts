import { createId } from "@paralleldrive/cuid2"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { oneHrFromNow } from "@/lib/util/date"
import { getRandomName, randInt } from "@/lib/util/etc"
import {
  ColData,
  Customer,
  CustomerQueryResult,
  CustomerSalesReport,
  CustomerSalesReportRow,
  Item,
  ItemQueryResponse,
  ItemQueryResponseItem,
  SalesRow,
  SalesTotalsRow,
} from "@/types/qbo-api"
import {
  accounts,
  billingAddresses,
  campaigns,
  doneeInfos,
  prices,
  products,
  receipts,
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

// type ResMock = {
//   getHeader: () => void
//   setHeader: () => ResMock
//   status: Mock<(statusCode: number) => ResMock>
//   end: () => void
//   json: Mock<(json: any) => void>
// }
// export function getMockApiContext(
//   method: "GET" | "POST",
//   sessionToken: string,
//   body: any | undefined,
// ) {
//   const req = {
//     method,
//     cookies: {
//       "next-auth.session-token": sessionToken,
//     },
//     body,
//   }
//   const res: ResMock = {
//     getHeader: () => {},
//     setHeader: () => res,
//     status: mock((statusCode: number) => res),
//     end: () => {},
//     json: mock((json: any) => {}),
//   }
//   return { req, res }
// }

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

export const deleteAll = () =>
  Promise.all([
    db.delete(sessions),
    db.delete(users),
    db.delete(accounts),
    db.delete(receipts),
    db.delete(doneeInfos),
    db.delete(userDatas),
    db.delete(campaigns),
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

const customerSalesReportHeader = {
  Time: "2023-03-23T14:08:37.242Z",
  ReportName: "Customer Sales Report",
  ReportBasis: "Accrual",
  StartPeriod: "2022-01-01",
  EndPeriod: "2022-12-31",
  SummarizeColumnsBy: "Name",
  Currency: "USD",
  Option: [],
}

const address = {
  Id: "123",
  Line1: "123 Main St",
  City: "San Francisco",
  PostalCode: "94105",
  CountrySubDivisionCode: "CA",
} as const
const customerShared = {
  Taxable: true,
  Job: true,
  BillWithParent: true,
  Balance: 0,
  BalanceWithJobs: 0,
  CurrencyRef: {
    value: "CAD",
    name: "CAD",
  },
  PreferredDeliveryMethod: "shipped",
  domain: "QBO",
  sparse: true,
  SyncToken: "123",
  MetaData: {
    CreateTime: "2022-02-13T09:35:48.590Z",
    LastUpdatedTime: "2022-02-13T09:35:48.590Z",
  },
  Id: createId(),
  Active: true,
  PrimaryEmailAddr: {
    Address: "delivered@resend.dev",
  },
  BillAddr: address,
} as const

const itemQueryResponseItemsShared = {
  Active: true,
  Taxable: true,
  UnitPrice: 100,
  Type: "service",
  IncomeAccountRef: {
    value: "123",
    name: "donations",
  },
  PurchaseCost: 0,
  TrackQtyOnHand: false,
  domain: "QBO",
  sparse: true,
  SyncToken: "123",
  MetaData: {
    CreateTime: "2022-02-13T09:35:48.590Z",
    LastUpdatedTime: "2022-02-13T09:35:48.590Z",
  },
} as const

export function createMockResponses(itemCount: number, donorCount: number) {
  const customerSalesReportColumns: CustomerSalesReport["Columns"]["Column"] = [
    {
      ColTitle: "Name",
      ColType: "String",
      MetaData: [
        {
          Name: "ID",
          Value: "123",
        },
      ],
    },
  ]
  const items: Item[] = []
  const itemQueryResponseItems: ItemQueryResponseItem[] = []
  for (let i = 0; i < itemCount; ++i) {
    const name = i + " Donations"
    const id = createId()
    items.push({ name, id })
    customerSalesReportColumns.push({
      ColTitle: name,
      ColType: "Amount",
      MetaData: [
        {
          Name: "ID",
          Value: id,
        },
      ],
    })
    itemQueryResponseItems.push({
      ...itemQueryResponseItemsShared,
      Id: id,
      Description: "description",
      Name: name,
      FullyQualifiedName: name,
    })
  }
  customerSalesReportColumns.push({
    ColTitle: "Total",
    ColType: "Amount",
    MetaData: [],
  })

  const customers: { donorId: string; name: string; email: string }[] = []
  const customerQueryCustomers: Customer[] = []
  for (let i = 0; i < donorCount; ++i) {
    const name = getRandomName()
    const donorId = createId()
    customers.push({ name, email: "delivered@resend.dev", donorId })
    const [firstName, familyName] = name.split(" ")
    const customer: Customer = {
      ...customerShared,
      Id: donorId,
      GivenName: firstName,
      MiddleName: firstName,
      FamilyName: familyName,
      DisplayName: name,
      FullyQualifiedName: name,
      PrintOnCheckName: name,
      Active: true,
      PrimaryEmailAddr: {
        Address: "delivered@resend.dev",
      },
      BillAddr: address,
    } as const
    customerQueryCustomers.push(customer)
  }
  const customerQueryResult: CustomerQueryResult = {
    QueryResponse: {
      Customer: customerQueryCustomers,
      maxResults: donorCount,
      startPosition: 0,
    },
    time: "2024-02-13T09:35:48.590Z",
  }

  const itemTotals = new Array<number>(itemCount).fill(0)
  const cutsomerSalesReportRows: CustomerSalesReportRow[] = []
  for (let i = 0; i < donorCount; ++i) {
    const customer = customers[i]
    const colData: ColData[] = [{ value: customer.name, id: customer.donorId }]
    let total = 0
    for (let j = 0; j < itemCount; ++j) {
      if (Math.random() > 0.7) {
        colData.push({ value: "0.00", id: "" })
        continue
      }
      const mag = randInt(1, 4)
      const balance = Math.floor(Math.random() * Math.pow(10, mag))
      total += balance
      itemTotals[j] += balance
      colData.push({ value: `${balance}.00`, id: "" })
    }
    colData.push({ value: `${total}.00`, id: "" })
    cutsomerSalesReportRows.push({ ColData: colData } satisfies SalesRow)
  }
  const totalsColData = itemTotals.map(total => ({ value: `${total}.00` }))
  totalsColData.unshift({ value: "TOTAL" })
  const totalDonations = itemTotals.reduce((prev, curr) => prev + curr)
  totalsColData.push({ value: `${totalDonations}.00` })
  const totalRow: SalesTotalsRow = {
    group: "GrandTotal",
    Summary: { ColData: totalsColData },
    type: "Section",
  }
  cutsomerSalesReportRows.push(totalRow)

  const customerSalesReport: CustomerSalesReport = {
    Header: customerSalesReportHeader,
    Columns: { Column: customerSalesReportColumns },
    Rows: { Row: cutsomerSalesReportRows },
  }

  const itemQueryResponse: ItemQueryResponse = {
    QueryResponse: { Item: itemQueryResponseItems, maxResults: itemCount, startPosition: 0 },
    time: "2024-02-13T09:35:48.590Z",
  }

  return { items, customers, itemQueryResponse, customerQueryResult, customerSalesReport }
}

export const mockResponses = createMockResponses(15, 200)

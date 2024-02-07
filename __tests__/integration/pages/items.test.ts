import { createId } from "@paralleldrive/cuid2"
import { describe, expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import { Session } from "next-auth"

import { LayoutProps } from "@/components/layout"
import { disconnectedRedirect } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { serialiseDates } from "@/lib/util/nextjs-helper"
import { getServerSideProps } from "@/pages/items"
import { Item } from "@/types/qbo-api"
import { doneeInfos, userDatas } from "db/schema"
import { createUser, getMockApiContext, mockDoneeInfo, mockItemQueryResponse } from "../mocks"

describe("items page getServerSideProps", () => {
  test("getServerSideProps returns sign in redirect when user is not signed in", async () => {
    const ctx = getMockApiContext("GET", "", {})
    const props = await getServerSideProps(ctx as any)
    expect(props).toEqual({
      redirect: {
        permanent: false,
        destination: "/auth/signin?callback=items",
      },
    })
  })

  test("getServerSideProps returns disconnected redirect when user is not conneted", async () => {
    const { session, deleteUser } = await createUser(false)
    const ctx = getMockApiContext("GET", session.sessionToken, {})
    const props = await getServerSideProps(ctx as any)
    expect(props).toEqual(disconnectedRedirect)
    await deleteUser()
  })

  test("getServerSideProps returns expected items when user is connected", async () => {
    const { user, account, session, deleteUser } = await createUser(true)

    const ctx = getMockApiContext("GET", session.sessionToken, {})
    const props = await getServerSideProps(ctx as any)
    const expectedProps = {
      itemsFilledIn: false,
      session: {
        accountId: account.id,
        expires: session.expires.toISOString(),
        user: {
          email: user.email,
          id: user.id,
          name: user.name as string,
        },
      } satisfies Session,
      items: mockItemQueryResponse.QueryResponse.Item.map(({ Id, Name }) => ({
        id: Id,
        name: Name,
      })) satisfies Item[],
      detailsFilledIn: false,
      companies: [
        { companyName: account.companyName as string, id: account.id },
      ] satisfies LayoutProps["companies"],
      selectedAccountId: session.accountId,
    } as const
    expect(props).toEqual({ props: expectedProps })

    const doneeInfo = mockDoneeInfo(account.id)
    await db.insert(doneeInfos).values(doneeInfo)

    const props2 = await getServerSideProps(ctx as any)
    expect(props2).toEqual({ props: { ...expectedProps, detailsFilledIn: true } })

    await Promise.all([deleteUser(), db.delete(doneeInfos).where(eq(doneeInfos.id, doneeInfo.id))])
  })

  test("getServerSideProps returns selected items when they are in db", async () => {
    const { user, account, session, deleteUser } = await createUser(true)

    const selectedItems = ["1", "2"]
    const startDate = new Date("2023-01-01")
    const endDate = new Date("2023-12-31")

    const userDataId = createId()
    await db.insert(userDatas).values({
      accountId: account.id,
      startDate,
      endDate,
      id: userDataId,
      items: selectedItems.join(","),
    })

    const ctx = getMockApiContext("GET", session.sessionToken, {})
    const props = await getServerSideProps(ctx as any)
    const expectedProps = serialiseDates({
      itemsFilledIn: true,
      dateRange: { startDate: startDate, endDate: endDate },
      selectedItems,
      session: {
        accountId: account.id,
        expires: session.expires.toISOString(),
        user: {
          email: user.email,
          id: user.id,
          name: user.name as string,
        },
      } satisfies Session,
      items: [
        { id: "1", name: "General Donations" },
        { id: "2", name: "A Donations" },
        { id: "3", name: "B Donations" },
      ] satisfies Item[],
      detailsFilledIn: false,
      companies: [
        { companyName: account.companyName as string, id: account.id },
      ] satisfies LayoutProps["companies"],
      selectedAccountId: session.accountId,
    } as const)
    expect(props).toEqual({ props: expectedProps })

    const doneeInfo = mockDoneeInfo(account.id)
    await db.insert(doneeInfos).values(doneeInfo)

    const props2 = await getServerSideProps(ctx as any)
    expect(props2).toEqual({ props: { ...expectedProps, detailsFilledIn: true } })

    await Promise.all([
      deleteUser(),
      db.delete(userDatas).where(eq(userDatas.id, userDataId)),
      db.delete(doneeInfos).where(eq(doneeInfos.id, doneeInfo.id)),
    ])
  })
})

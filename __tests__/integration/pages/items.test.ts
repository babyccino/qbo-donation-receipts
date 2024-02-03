import { describe, expect, test } from "bun:test"
import { Session } from "next-auth"

import { LayoutProps } from "@/components/layout"
import { disconnectedRedirect } from "@/lib/auth/next-auth-helper-server"
import { getServerSideProps } from "@/pages/items"
import { Item } from "@/types/qbo-api"
import { createUser, getMockApiContext } from "../mocks"

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

  test("getServerSideProps returns sign in redirect when user is not signed in", async () => {
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
    } as const
    expect(props).toEqual({ props: expectedProps })

    await deleteUser()
  })
})

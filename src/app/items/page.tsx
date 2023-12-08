import { createId } from "@paralleldrive/cuid2"
import { and, desc, eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getServerSession } from "@/app/auth-util"
import { buttonStyling } from "@/components/link"
import { refreshTokenIfNeeded } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { getItems } from "@/lib/qbo-api"
import { parseRequestBody } from "@/lib/util/request-server"
import { accounts, sessions, userDatas } from "db/schema"
import ClientForm from "./client"

const parser = z.object({
  items: z.array(z.string()),
  dateRange: z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
})

export default async function Items() {
  const session = await getServerSession()
  if (!session) return redirect("/auth/signin?callback=/items")

  const account = await db.query.accounts.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: and(
      eq(accounts.userId, session.user.id),
      session.accountId ? eq(accounts.id, session.accountId) : eq(accounts.scope, "accounting"),
    ),
    columns: {
      id: true,
      accessToken: true,
      scope: true,
      realmId: true,
      createdAt: true,
      expiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
    },
    with: {
      userData: { columns: { items: true, startDate: true, endDate: true } },
      doneeInfo: { columns: { id: true } },
    },
    orderBy: desc(accounts.updatedAt),
  })
  if (session.accountId && !account)
    throw new ApiError(500, "account for given user and session not found in db")

  // if the session does not specify an account but there is a connected account
  // then the session is connected to one of these accounts
  if (!session.accountId && account) {
    session.accountId = account.id
    await db
      .update(sessions)
      .set({ accountId: account.id })
      .where(eq(sessions.userId, session.user.id))
  }

  if (
    !account ||
    account.scope !== "accounting" ||
    !account.accessToken ||
    !account.realmId ||
    !session.accountId
  )
    return redirect("/auth/disconnected")

  await refreshTokenIfNeeded(account)
  const realmId = account.realmId
  const items = await getItems(account.accessToken, realmId)
  const detailsFilledIn = Boolean(account.doneeInfo)

  async function formAction(formData: FormData) {
    "use server"
    const session = await getServerSession()
    if (!session?.accountId)
      throw new ApiError(401, "user's session not connected to a qbo account")

    const data = parseRequestBody(parser, {
      items: formData.getAll("items"),
      startDate: formData.get("dateRange.startDate"),
      endDate: formData.get("dateRange.endDate"),
    })
    const {
      items: itemsStr,
      dateRange: { startDate, endDate },
    } = data

    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.accountId),
      columns: {
        id: true,
        scope: true,
      },
    })
    if (!account) throw new ApiError(401, "account not found for given userid and company realmid")

    const items = itemsStr.join(",")
    await db
      .insert(userDatas)
      .values({
        id: createId(),
        accountId: account.id,
        endDate,
        startDate,
        items,
      })
      .onConflictDoUpdate({
        target: [userDatas.accountId],
        set: { startDate, endDate, items, updatedAt: new Date() },
      })

    redirect(detailsFilledIn ? "/generate-receipts" : "/details")
  }

  if (!account.userData) {
    return (
      <form
        action={formAction}
        className="m-auto flex w-full max-w-lg flex-col items-center justify-center space-y-4 p-4"
      >
        <ClientForm itemsFilledIn={false} items={items} />
        <input
          className={buttonStyling + " text-l"}
          type="submit"
          value={detailsFilledIn ? "Generate Receipts" : "Enter Donee Details"}
        />
      </form>
    )
  }

  const { userData } = account
  const itemsFilledIn = Boolean(userData)
  const selectedItems = userData?.items ? userData.items.split(",") : []
  const dateRange = { startDate: userData.startDate, endDate: userData.endDate }

  return (
    <form
      action={formAction}
      className="m-auto flex w-full max-w-lg flex-col items-center justify-center space-y-4 p-4"
    >
      <ClientForm
        itemsFilledIn={true}
        items={items}
        dateRange={dateRange}
        selectedItems={selectedItems}
      />
      <input
        className={buttonStyling + " text-l"}
        type="submit"
        value={detailsFilledIn ? "Generate Receipts" : "Enter Donee Details"}
      />
    </form>
  )
}

import { accounts } from "db/schema"
import { AccountStatus, accountStatus } from "../auth/drizzle-adapter"
import { refreshAccessToken } from "../qbo-api"
import { db } from "./test"
import { eq } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"

export type RemoveTimestamps<T extends { createdAt: Date; updatedAt: Date }> = Omit<
  T,
  "createdAt" | "updatedAt"
>

export function removeTimestamps<T extends { createdAt: Date; updatedAt: Date }>(
  obj: T,
): RemoveTimestamps<T> {
  // @ts-ignore
  delete obj.createdAt
  // @ts-ignore
  delete obj.updatedAt
  return obj
}

export async function refreshTokenIfNeeded(account: {
  id: string
  accessToken: string
  expiresAt: Date
  refreshToken: string
  refreshTokenExpiresAt: Date
}) {
  const currentAccountStatus = accountStatus(account)
  console.log({ currentAccountStatus })
  if (currentAccountStatus === AccountStatus.RefreshExpired) {
    // implement refresh token expired logicS
    throw new ApiError(400, "refresh token expired")
  } else if (currentAccountStatus === AccountStatus.Active) {
    return account
  }
  const token = await refreshAccessToken(account.refreshToken)
  const expiresAt = new Date(Date.now() + 1000 * (token.expires_in ?? 60 * 60))
  const refreshTokenExpiresAt = new Date(
    Date.now() + 1000 * (token.x_refresh_token_expires_in ?? 60 * 60 * 24 * 101),
  )
  const updatedAt = new Date()
  await db
    .update(accounts)
    .set({
      accessToken: token.access_token,
      expiresAt,
      refreshToken: token.refresh_token,
      refreshTokenExpiresAt,
      updatedAt,
    })
    .where(eq(accounts.id, account.id))
  account.accessToken = token.access_token
  account.expiresAt = expiresAt
  account.refreshToken = token.refresh_token
  account.refreshTokenExpiresAt = refreshTokenExpiresAt
  return { account, currentAccountStatus }
}

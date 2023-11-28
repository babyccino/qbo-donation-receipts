import { createId } from "@paralleldrive/cuid2"
import { and, eq } from "drizzle-orm"
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { LibSQLDatabase } from "drizzle-orm/libsql"
import { Adapter, AdapterSession } from "next-auth/adapters"
import { ApiError } from "next/dist/server/api-utils"

import { accounts, sessions, users, verificationTokens } from "db/schema"

const DEFAULT_QBO_REFRESH_PERIOD_DAYS = 101
const SECONDS_IN_DAY = 60 * 60 * 24
const DEFAULT_QBO_REFRESH_PERIOD_MS = DEFAULT_QBO_REFRESH_PERIOD_DAYS * SECONDS_IN_DAY * 1000

export enum AccountStatus {
  Active = 0,
  AccessExpired,
  RefreshExpired,
}
export function accountStatus({
  expiresAt,
  refreshTokenExpiresAt,
}: {
  expiresAt: Date
  refreshTokenExpiresAt: Date
}) {
  if (Date.now() > refreshTokenExpiresAt.getTime()) return AccountStatus.RefreshExpired
  if (Date.now() > expiresAt.getTime()) return AccountStatus.AccessExpired
  return AccountStatus.Active
}

export const DrizzleAdapter = (db: BetterSQLite3Database | LibSQLDatabase): Adapter => ({
  async createUser(userData) {
    await db.insert(users).values({
      ...userData,
      emailVerified: new Date(),
      id: createId(),
    })
    const [newUser] = await db.select().from(users).where(eq(users.email, userData.email)).limit(1)
    if (!newUser) throw new Error("User not found")
    return newUser
  },
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return user ?? null
  },
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return user ?? null
  },
  async getUserByAccount({ providerAccountId, provider }) {
    const [row] = await db
      .select()
      .from(users)
      .innerJoin(accounts, eq(users.id, accounts.userId))
      .where(
        and(eq(accounts.providerAccountId, providerAccountId), eq(accounts.provider, provider)),
      )
      .limit(1)
    const user = row?.users
    return user ?? null
  },
  async updateUser({ id, emailVerified, ...userData }) {
    if (!id) throw new Error("User not found")
    await db.update(users).set(userData).where(eq(users.id, id))
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!user) throw new Error("User not found")
    return user
  },
  async deleteUser(userId) {
    await db.delete(users).where(eq(users.id, userId))
  },
  async linkAccount(account) {
    const realmId = typeof account.realmId === "string" ? account.realmId : undefined
    const expiresAt = new Date(
      account.expires_at !== undefined
        ? (account.expires_at as number) * 1000
        : Date.now() + 1000 * 60 * 60,
    )
    const refreshTokenExpiresInSeconds = (account.x_refresh_token_expires_in ??
      account.refresh_token_expires_in) as number | undefined
    const refreshTokenExpiresAt = new Date(
      Date.now() +
        (refreshTokenExpiresInSeconds !== undefined
          ? refreshTokenExpiresInSeconds * 1000
          : DEFAULT_QBO_REFRESH_PERIOD_MS),
    )
    if (!account.access_token) throw new ApiError(500, "qbo did not return access code")
    if (account.scope !== "profile" && account.scope !== "accounting")
      throw new ApiError(500, "invalid account scope")
    await db.insert(accounts).values({
      id: createId(),
      userId: account.userId,
      realmId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      accessToken: account.access_token,
      expiresAt,
      idToken: account.id_token as string,
      refreshToken: account.refresh_token as string,
      refreshTokenExpiresAt,
      scope: account.scope,
      tokenType: account.token_type,
    })
  },
  async unlinkAccount({ providerAccountId, provider }) {
    await db
      .delete(accounts)
      .where(
        and(eq(accounts.providerAccountId, providerAccountId), eq(accounts.provider, provider)),
      )
  },
  async createSession(data) {
    await db.insert(sessions).values({
      id: createId(),
      expires: data.expires?.getTime(),
      sessionToken: data.sessionToken,
      userId: data.userId,
    })
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, data.sessionToken))
      .limit(1)
    if (!session) throw new Error("User not found")
    return { ...session, expires: new Date(session.expires) }
  },
  async getSessionAndUser(sessionToken) {
    const [row] = await (db as BetterSQLite3Database)
      .select({
        user: users,
        session: {
          id: sessions.id,
          userId: sessions.userId,
          sessionToken: sessions.sessionToken,
          expires: sessions.expires,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.sessionToken, sessionToken))
      .limit(1)
    if (!row) return null
    const { user, session } = row
    return {
      user,
      session: {
        id: session.id,
        userId: session.userId,
        sessionToken: session.sessionToken,
        expires: new Date(session.expires),
      } satisfies AdapterSession,
    }
  },
  async updateSession(session) {
    await db
      .update(sessions)
      .set({ ...session, expires: session.expires?.getTime() })
      .where(eq(sessions.sessionToken, session.sessionToken))
    const [dbSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, session.sessionToken))
      .limit(1)
    if (!dbSession) throw new Error("Coding bug: updated session not found")
    return { ...dbSession, expires: new Date(dbSession.expires) }
  },
  async deleteSession(sessionToken) {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken))
  },
  async createVerificationToken(verificationToken) {
    await db.insert(verificationTokens).values({
      expires: verificationToken.expires.getTime(),
      identifier: verificationToken.identifier,
      token: verificationToken.token,
    })
    const [dbToken] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, verificationToken.token))
      .limit(1)
    if (!dbToken) throw new Error("Coding bug: inserted verification token not found")
    return { ...dbToken, expires: new Date(dbToken.expires) }
  },
  async useVerificationToken({ identifier, token }) {
    const [dbToken] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .limit(1)
    if (!dbToken) return null
    await db
      .delete(verificationTokens)
      .where(
        and(eq(verificationTokens.token, token), eq(verificationTokens.identifier, identifier)),
      )
    return { ...dbToken, expires: new Date(dbToken.expires) }
  },
})

import { createId } from "@paralleldrive/cuid2"
import { and, eq } from "drizzle-orm"
import { LibSQLDatabase } from "drizzle-orm/libsql"
import { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters"

import { accounts, sessions, users, verificationTokens } from "db/schema"
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"

export function DrizzleAdapter(db: BetterSQLite3Database | LibSQLDatabase): Adapter {
  return {
    async createUser(userData) {
      console.log("createUser")
      console.log("adapter userData: ", userData)
      await db.insert(users).values({
        ...userData,
        id: createId(),
      })
      const [user] = await db.select().from(users).where(eq(users.email, userData.email)).limit(1)
      if (!user) throw new Error("User not found")
      return user
    },
    async getUser(id) {
      console.log("getUser")
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      return user ?? null
    },
    async getUserByEmail(email) {
      console.log("getUserByEmail")
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      return user ?? null
    },
    async getUserByAccount({ providerAccountId, provider }) {
      console.log("getUserByAccount")
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
      console.log("updateUser")
      if (!id) throw new Error("User not found")
      await db.update(users).set(userData).where(eq(users.id, id))
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      if (!user) throw new Error("User not found")
      return user
    },
    async deleteUser(userId) {
      console.log("deleteUser")
      await db.delete(users).where(eq(users.id, userId))
    },
    async linkAccount(account) {
      console.log("linkAccount")
      await db.insert(accounts).values({
        id: createId(),
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        access_token: account.access_token,
        expires_in: account.expires_in as number,
        id_token: account.id_token,
        refresh_token: account.refresh_token,
        refresh_token_expires_in: account.refresh_token_expires_in as number,
        scope: account.scope,
        token_type: account.token_type,
      })
    },
    async unlinkAccount({ providerAccountId, provider }) {
      console.log("unlinkAccount")
      await db
        .delete(accounts)
        .where(
          and(eq(accounts.providerAccountId, providerAccountId), eq(accounts.provider, provider)),
        )
    },
    async createSession(data) {
      console.log("createSession")
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
      console.log("getSessionAndUser")
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
      console.log("updateSession")
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
      console.log("deleteSession")
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken))
    },
    async createVerificationToken(verificationToken) {
      console.log("createVerificationToken")
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
      console.log("useVerificationToken")
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
  }
}

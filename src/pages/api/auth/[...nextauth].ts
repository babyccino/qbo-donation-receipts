import { eq } from "drizzle-orm"
import NextAuth, { CallbacksOptions, NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import { OAuthConfig } from "next-auth/providers"
import { ApiError } from "next/dist/server/api-utils"

import { DrizzleAdapter } from "@/lib/auth/drizzle-adapter"
import { db } from "@/lib/db/test"
import { config } from "@/lib/util/config"
import { base64EncodeString } from "@/lib/util/image-helper"
import { fetchJsonData } from "@/lib/util/request"
import { OpenIdUserInfo, QBOProfile, QboAccount } from "@/types/qbo-api"
import { accounts, users } from "db/schema"
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"

const {
  qboClientId,
  qboClientSecret,
  qboWellKnown,
  qboOauthRoute,
  qboAccountsBaseRoute,
  nextauthSecret,
} = config
const MS_IN_HOUR = 3600000

export const qboProvider: OAuthConfig<QBOProfile> = {
  id: "QBO",
  name: "QBO",
  clientId: qboClientId,
  clientSecret: qboClientSecret,
  type: "oauth",
  version: "2.0",
  wellKnown: qboWellKnown,
  authorization: {
    params: { scope: "com.intuit.quickbooks.accounting openid profile address email phone" },
  },
  idToken: true,
  checks: ["pkce", "state"],
  profile: profile => ({
    id: profile.sub,
  }),
}

export const qboProviderDisconnected: OAuthConfig<QBOProfile> = {
  ...qboProvider,
  id: "QBO-disconnected",
  name: "QBO-disconnected",
  authorization: {
    params: { scope: "openid profile address email phone" },
  },
}

type QboCallbacksOptions = CallbacksOptions<QBOProfile, QboAccount>
const signIn: QboCallbacksOptions["signIn"] = async ({ user, account, profile }) => {
  if (!account || !profile) return "/404"

  const { access_token: accessToken } = account
  if (!accessToken) throw new ApiError(500, "access token not provided")

  // realmId will be undefined if the user doesn't have qbo accounting permission
  const { realmid: realmId } = profile
  const connectUser = Boolean(realmId)
  account.scope = connectUser ? "accounting" : "profile"
  account.realmId = realmId

  const userInfo = await fetchJsonData<OpenIdUserInfo>(
    `${qboAccountsBaseRoute}/openid_connect/userinfo`,
    accessToken as string,
  )
  const { email, givenName: name } = userInfo
  if (typeof email !== "string") throw new ApiError(500, "email not returned by openid request")
  if (typeof name !== "string") throw new ApiError(500, "name not returned by openid request")
  const rows = await db
    .select({ provider: accounts.provider })
    .from(users)
    .innerJoin(accounts, eq(accounts.userId, users.id))
    .where(eq(users.email, email))
    .limit(1)

  // if (companyInfo && companyInfo.country !== "CA") return "/terms/country"
  if (!userInfo.emailVerified) return "/terms/email-verified"

  user.email = email
  user.name = name

  const connected = rows.map(row => row.provider).includes("QBO")
  // if user has previously been connected but has signed in without accounting permission
  // then sign them in with accounting permissions
  if (connected && !connectUser) return "/api/auth/sso"

  return true
}

const session: QboCallbacksOptions["session"] = async ({ session, user }) => {
  return {
    ...session,
    user: {
      id: user.id ?? session.user.id,
      name: user.name ?? session.user.name,
      email: user.email ?? session.user.email,
    },
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db as BetterSQLite3Database<any>),
  session: {
    strategy: "database",
    maxAge: 60 * 30,
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [qboProvider, qboProviderDisconnected],
  theme: {
    colorScheme: "dark",
  },
  callbacks: {
    // @ts-ignore using qbo profile instead of default next-auth profile breaks type for some reason
    signIn,
    session,
  },
  secret: nextauthSecret,
}

export default NextAuth(authOptions)

import NextAuth, { CallbacksOptions, NextAuthOptions, Session, getServerSession } from "next-auth"
import { OAuthConfig } from "next-auth/providers"
import { ApiError } from "next/dist/server/api-utils"

import { DrizzleAdapter } from "@/lib/auth/drizzle-adapter"
import { db } from "@/lib/db"
import { config } from "@/lib/util/config"
import { fetchJsonData } from "@/lib/util/request"
import { OpenIdUserInfo, QBOProfile, QboAccount } from "@/types/qbo-api"
import { GetServerSidePropsContext } from "next"

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
  allowDangerousEmailAccountLinking: true,
}

export const qboProviderDisconnected: OAuthConfig<QBOProfile> = {
  ...qboProvider,
  id: "QBO-disconnected",
  name: "QBO-disconnected",
  authorization: {
    params: { scope: "openid profile address email phone" },
  },
  allowDangerousEmailAccountLinking: true,
}

type QboCallbacksOptions = CallbacksOptions<QBOProfile, QboAccount>
const signIn: QboCallbacksOptions["signIn"] = async ({ user, account, profile }) => {
  if (!account || !profile) return "/404"

  const { access_token: accessToken } = account
  if (!accessToken) throw new ApiError(500, "access token not provided")

  // realmId will be undefined if the user doesn't have qbo accounting permission
  const { realmid: realmId } = profile
  account.realmId = realmId

  const userInfo = await fetchJsonData<OpenIdUserInfo>(
    `${qboAccountsBaseRoute}/openid_connect/userinfo`,
    accessToken as string,
  )
  const { email, givenName: name } = userInfo
  if (typeof email !== "string") throw new ApiError(500, "email not returned by openid request")
  if (typeof name !== "string") throw new ApiError(500, "name not returned by openid request")

  // if (companyInfo && companyInfo.country !== "CA") return "/terms/country"
  if (!userInfo.emailVerified) return "/terms/email-verified"

  user.email = email
  user.name = name

  return true
}

const session: QboCallbacksOptions["session"] = async ({ session, user }) => {
  return {
    user: {
      id: user.id ?? session.user.id,
      name: user.name ?? session.user.name,
      email: user.email ?? session.user.email,
    },
    accountId: session.accountId,
    expires: (session.expires as unknown as Date).toISOString(),
  } satisfies Session
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
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
export const auth = (ctx: GetServerSidePropsContext) =>
  getServerSession(ctx.req, ctx.res, authOptions)

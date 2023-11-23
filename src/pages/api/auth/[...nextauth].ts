import NextAuth, { CallbacksOptions, NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import { OAuthConfig } from "next-auth/providers"
import { ApiError } from "next/dist/server/api-utils"

import { DrizzleAdapter } from "@/lib/auth/drizzle-adapter"
import { getCompanyInfo } from "@/lib/qbo-api"
import { db, getUserDataWithDonee } from "@/lib/test"
import { config } from "@/lib/util/config"
import { base64EncodeString } from "@/lib/util/image-helper"
import { fetchJsonData } from "@/lib/util/request"
import { User } from "@/types/db"
import { QboPermission } from "@/types/next-auth-helper"
import { CompanyInfo, OpenIdUserInfo, QBOProfile, QboAccount } from "@/types/qbo-api"
import { doneeInfos, users } from "db/schema"
import { eq } from "drizzle-orm"

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

async function refreshAccessToken(token: JWT): Promise<JWT> {
  console.log("refreshing access token")

  const url = `${qboOauthRoute}/tokens/bearer`
  const encoded = base64EncodeString(`${qboClientId}:${qboClientSecret}`)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=refresh_token&refresh_token=${token.refreshToken}`,
  })
  const refreshedTokens = await response.json()
  if (!response.ok) {
    throw refreshedTokens
  }

  return {
    ...token,
    accessToken: refreshedTokens.access_token,
    accessTokenExpires: Date.now() + MS_IN_HOUR,
    refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
  }
}

type QboCallbacksOptions = CallbacksOptions<QBOProfile, QboAccount>
const signIn: QboCallbacksOptions["signIn"] = async ({ user, account, profile }) => {
  if (!account || !profile) return "/404"

  const { id } = user
  const { access_token: accessToken, providerAccountId: qboId } = account
  if (!accessToken) throw new ApiError(500, "access token not provided")

  // realmId will be undefined if the user doesn't have qbo accounting permission
  const { realmid: realmId } = profile
  const connectUser = Boolean(realmId)

  // all the fetch/database requests are done at the same time for performance
  // then all the necessary information for the other steps of the sign-in process
  // is passed down through the user/account/profile/token/session/etc.
  const userInfo = await fetchJsonData<OpenIdUserInfo>(
    `${qboAccountsBaseRoute}/openid_connect/userinfo`,
    accessToken as string,
  )
  const { email, givenName: name } = userInfo
  if (typeof email !== "string") throw new ApiError(500, "email not returned by openid request")
  if (typeof name !== "string") throw new ApiError(500, "name not returned by openid request")
  const [companyInfo, rows] = await Promise.all([
    connectUser ? getCompanyInfo(accessToken, realmId as string) : null,
    db
      .select({ user: users, doneeInfo: doneeInfos })
      .from(users)
      .where(eq(users.email, email))
      .leftJoin(doneeInfos, eq(doneeInfos.userId, users.id))
      .limit(1),
  ])

  // if (companyInfo && companyInfo.country !== "CA") return "/terms/country"
  if (!userInfo.emailVerified) return "/terms/email-verified"

  user.email = email
  user.name = name

  const row = rows[0] as (typeof rows)[number] | undefined
  // if user has previously been connected but has signed in without accounting permission
  // then sign them in with accounting permissions
  if (row && row.user?.connected && !connectUser) return "/api/auth/sso"

  const set: Partial<User> = {
    id,
    name,
    email,
    connected: connectUser,
    qboId,
    updatedAt: new Date(),
  }
  if (realmId) set.realmId = realmId

  // if the user is new or they have no donee info we can save the data
  const shouldUpdateDonee = connectUser && (!row || (row && !row.doneeInfo))
  await Promise.all([
    db.update(users).set(set).where(eq(users.id, id)),
    shouldUpdateDonee &&
      db
        .update(doneeInfos)
        .set({ ...(companyInfo as CompanyInfo), updatedAt: new Date() })
        .where(eq(doneeInfos.userId, id)),
  ])
  return true
}

const jwt: QboCallbacksOptions["jwt"] = async ({
  token,
  account,
  profile,
  user,
  trigger,
  session,
}) => {
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, token.email || ""))
    .limit(1)

  if (!dbUser && user) {
    token.id = user?.id
  }

  token = { ...token, id: dbUser.id, name: dbUser.name, email: dbUser.email, picture: dbUser.image }

  if (account && profile) {
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      providerAccountId: id,
    } = account
    if (!accessToken || !refreshToken || expiresAt === undefined)
      throw new Error("Account is missing important data\naccount:" + JSON.stringify(account))

    const accessTokenExpires = Date.now() + MS_IN_HOUR
    const { realmid: realmId } = profile

    token = {
      ...token,
      accessToken,
      refreshToken,
      accessTokenExpires,
      qboId: id ?? null,
      realmId: realmId ?? null,
      qboPermission: realmId ? QboPermission.Accounting : QboPermission.Profile,
      name: user.name as string,
      email: user.email as string,
    }
  }

  if (trigger === "update") {
    token = { ...token, ...session }
  }

  if (Date.now() >= (token.accessTokenExpires as number)) return refreshAccessToken(token)
  else return token
}

const session: QboCallbacksOptions["session"] = async ({
  session,
  token,
  newSession,
  trigger,
  user,
}) => {
  return {
    ...session,
    user: {
      id: user.id ?? session.user.id,
      name: user.name ?? session.user.name,
      email: user.email ?? session.user.email,
      qboId: user.qboId ?? session.user.qboId,
    },
  }
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
    // @ts-ignore using qbo profile instead of default next-auth profile breaks type
    signIn,
    // @ts-ignore
    jwt,
    session,
  },
  secret: nextauthSecret,
}

export default NextAuth(authOptions)

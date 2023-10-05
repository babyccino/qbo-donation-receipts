import NextAuth, { NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import { OAuthConfig } from "next-auth/providers"
import { CallbacksOptions } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"

import { user as firestoreUser } from "@/lib/db"
import { getCompanyInfo } from "@/lib/qbo-api"
import { QBOProfile, OpenIdUserInfo, QboAccount, CompanyInfo } from "@/types/qbo-api"
import { base64EncodeString } from "@/lib/util/image-helper"
import { fetchJsonData } from "@/lib/util/request"
import { config } from "@/lib/util/config"
import { QboPermission } from "@/types/next-auth-helper"
import { User } from "@/types/db"

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

  const { access_token: accessToken, providerAccountId: id } = account
  if (!accessToken) throw new ApiError(500, "access token not provided")

  // realmId will be undefined if the user doesn't have qbo accounting permission
  const { realmid: realmId } = profile
  const connectUser = Boolean(realmId)
  const doc = firestoreUser.doc(id)

  // all the fetch/database requests are done at the same time for performance
  // then all the necessary information for the other steps of the sign-in process
  // is passed down through the user/account/profile/token/session/etc.
  const [userInfo, companyInfo, dbUser] = await Promise.all([
    fetchJsonData<OpenIdUserInfo>(
      `${qboAccountsBaseRoute}/openid_connect/userinfo`,
      accessToken as string,
    ),
    connectUser ? getCompanyInfo(accessToken, realmId as string) : null,
    doc.get(),
  ])

  // if (companyInfo && companyInfo.country !== "CA") return "/terms/country"
  if (!userInfo.emailVerified) return "/terms/email-verified"

  const { email, givenName: name } = userInfo
  user.email = email
  user.name = name

  const dbUserData = dbUser.data()

  // if user has previously been connected but has signed in without accounting permission
  // then sign them in with accounting permissions
  if (dbUserData?.connected && !connectUser) return "/api/auth/sso"

  const set: Partial<User> = { id, name, email, connected: connectUser }
  if (realmId) set.realmId = realmId

  // if the user is new or they have no donee info we can save the data
  if (connectUser && (!dbUserData || (dbUserData && !dbUserData.donee)))
    set.donee = companyInfo as CompanyInfo

  await doc.set(set, { merge: true })
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
      id,
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

const session: QboCallbacksOptions["session"] = async ({ session, token }) => {
  return {
    ...session,
    accessToken: token.accessToken as string | null,
    realmId: token.realmId as string | null,
    qboPermission: token.qboPermission as QboPermission,
    user: {
      id: token.id as string,
      name: token.name as string,
      email: token.email as string,
    },
  }
}

export const authOptions: NextAuthOptions = {
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
  session: { maxAge: 60 * 30 },
  secret: nextauthSecret,
}

export default NextAuth(authOptions)

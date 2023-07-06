import NextAuth, { Account, NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import { OAuthConfig } from "next-auth/providers"
import { Session, CallbacksOptions } from "next-auth"

import { user as firestoreUser } from "@/lib/db"
import { QBOProfile, getCompanyInfo, OpenIdUserInfo } from "@/lib/qbo-api"
import { fetchJsonData, base64EncodeString, getResponseContent } from "@/lib/util/request"
import { config } from "@/lib/util/config"

const { qboClientId, qboClientSecret, qboWellKnown, qboOauthRoute, qboAccountsBaseRoute } = config
const MS_IN_HOUR = 3600000

export const customProvider: OAuthConfig<QBOProfile> = {
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

type QboCBOptions = CallbacksOptions<QBOProfile, Account>
const signIn: QboCBOptions["signIn"] = async ({ user, account, profile }) => {
  if (!account || !profile) return "/404"

  const { access_token: accessToken, providerAccountId: id } = account
  const { realmid: realmId } = profile
  const doc = firestoreUser.doc(id)

  // all the fetch/database requests are done at the same time for performance
  // then all the necessary information for the other steps of the sign-in process
  // is passed down through the user/account/profile/token/session/etc.
  const [userInfo, companyInfo, dbUser] = await Promise.all([
    fetchJsonData<OpenIdUserInfo>(
      `${qboAccountsBaseRoute}/openid_connect/userinfo`,
      accessToken as string
    ),
    getCompanyInfo({ realmId, accessToken } as Session),
    doc.get(),
  ])

  if (companyInfo.country !== "CA" || userInfo.address.country !== "CA") return "/terms"
  if (!userInfo.emailVerified) return "/email-verified"

  const { email, givenName: name } = userInfo
  user.email = email
  user.name = name

  const dbUserData = dbUser.data()
  if (!dbUserData) doc.set({ id, name, email, realmId, donee: companyInfo }, { merge: true })

  return true
}

const jwt: QboCBOptions["jwt"] = async ({ token, account, profile, user, trigger, session }) => {
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
      realmId,
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

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/auth/signin",
  },
  providers: [customProvider],
  theme: {
    colorScheme: "dark",
  },
  callbacks: {
    // @ts-ignore using qbo profile instead of default next-auth profile breaks type
    signIn,
    // @ts-ignore
    jwt,
    session: async ({ session, token }) => ({
      ...session,
      accessToken: token.accessToken as string,
      realmId: token.realmId as string,
      user: {
        id: token.id as string,
        name: token.name as string,
        email: token.email as string,
      },
    }),
  },
  secret: config.nextAuthSecret,
}

export default NextAuth(authOptions)

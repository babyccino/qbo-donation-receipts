import NextAuth, { NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import { OAuthConfig } from "next-auth/providers"
import { Session } from "next-auth"

import { user as firestoreUser } from "@/lib/db"
import { QBOProfile, getCompanyInfo } from "@/lib/qbo-api"
import { fetchJsonData, base64EncodeString, getResponseContent } from "@/lib/util/request"
import { config } from "@/lib/util/config"

const {
  qboClientId,
  qboClientSecret,
  qboWellKnown,
  qboOauthRoute,
  qboAccountsBaseRoute,
  qboOauthRevocationEndpoint,
  nextAuthJwtSecret,
} = config
const MS_IN_HOUR = 3600000

const customProvider: OAuthConfig<QBOProfile> = {
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

async function revokeAccessToken(token: JWT): Promise<void> {
  console.log("revoking access token")

  const { refreshToken } = token
  if (typeof refreshToken !== "string") throw new Error("jwt token missing refresh token")

  const url = qboOauthRevocationEndpoint
  const encoded = base64EncodeString(`${qboClientId}:${qboClientSecret}`)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${encoded}`,
      "Content-Type": "application/json",
    },
    body: `{"token":"${refreshToken}"}`,
  })

  if (!response.ok) {
    throw new Error(`access token could not be revoked: ${getResponseContent(response)}`)
  }
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/auth/signin",
  },
  providers: [customProvider],
  theme: {
    colorScheme: "dark",
  },
  jwt: {
    secret: nextAuthJwtSecret,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return "/404"

      const { access_token: accessToken, providerAccountId: id } = account
      const { realmid: realmId } = profile
      const doc = firestoreUser.doc(id)

      // all the fetch/database requests are done at the same time for performance
      // then all the necessary information for the other steps of the sign in process
      // is passed down through the user/account/profile/token/session/etc.
      const [userInfo, companyInfo, dbUser] = await Promise.all([
        fetchJsonData<{ email: string; givenName: string }>(
          `${qboAccountsBaseRoute}/openid_connect/userinfo`,
          accessToken as string
        ),
        getCompanyInfo({ realmId, accessToken } as Session),
        doc.get(),
      ])

      if (companyInfo.country !== "CA") return "/terms"

      const { email, givenName: name } = userInfo
      user.email = email
      user.name = name

      const dbUserData = dbUser.data()
      if (!dbUserData) doc.set({ id, name, email, realmId, donee: companyInfo }, { merge: true })

      return true
    },
    async jwt({ token, account, profile, user, trigger, session }) {
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
    },
    // async redirect({ url, baseUrl }) {
    //   return baseUrl
    // },
    session: async ({ session, token }) => {
      return {
        ...session,
        accessToken: token.accessToken as string,
        realmId: token.realmId as string,
        user: {
          id: token.id as string,
          name: token.name as string,
          email: token.email as string,
        },
      }
    },
  },
  events: {
    signOut: ({ token }) => revokeAccessToken(token),
  },
}

export default NextAuth(authOptions)

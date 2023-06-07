import NextAuth, { NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import { OAuthConfig } from "next-auth/providers"

import { user } from "@/lib/db"
import { QBOProfile } from "@/lib/qbo-api"
import { fetchJsonData, base64EncodeString } from "@/lib/util/request"

const MS_IN_HOUR = 3600000
const {
  NEXTAUTH_JWT_SECRET,
  QBO_CLIENT_ID,
  QBO_CLIENT_SECRET,
  QBO_WELL_KNOWN,
  QBO_SANDBOX_WELL_KNOWN,
  QBO_OAUTH_ROUTE,
  QBO_ACCOUNTS_BASE_ROUTE,
  QBO_SANDBOX_ACCOUNTS_BASE_ROUTE,
} = process.env

if (!NEXTAUTH_JWT_SECRET) throw new Error("missing vital env variable: NEXTAUTH_JWT_SECRET")
if (!QBO_CLIENT_ID) throw new Error("missing vital env variable: QBO_CLIENT_ID")
if (!QBO_CLIENT_SECRET) throw new Error("missing vital env variable: QBO_CLIENT_SECRET")
const wellKnown = QBO_SANDBOX_WELL_KNOWN || QBO_WELL_KNOWN
if (!wellKnown)
  throw new Error("missing vital env variable: QBO_WELL_KNOWN or QBO_SANDBOX_WELL_KNOWN")
if (!QBO_OAUTH_ROUTE) throw new Error("missing vital env variable: QBO_OAUTH_ROUTE")
const accountsBaseRoute = QBO_SANDBOX_ACCOUNTS_BASE_ROUTE || QBO_ACCOUNTS_BASE_ROUTE
if (!accountsBaseRoute)
  throw new Error(
    "missing vital env variable: QBO_ACCOUNTS_BASE_ROUTE or QBO_SANDBOX_ACCOUNTS_BASE_ROUTE"
  )

const customProvider: OAuthConfig<QBOProfile> = {
  id: "QBO",
  name: "QBO",
  clientId: QBO_CLIENT_ID,
  clientSecret: QBO_CLIENT_SECRET,
  type: "oauth",
  version: "2.0",
  wellKnown,
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

  const url = `${QBO_OAUTH_ROUTE}/tokens/bearer`

  const encoded = base64EncodeString(`${QBO_CLIENT_ID}:${QBO_CLIENT_SECRET}`)
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

const addUser = (id: string, name: string, email: string, realmId: string) =>
  user.doc(id).set({ id, name, email, realmId }, { merge: true })

export const authOptions: NextAuthOptions = {
  providers: [customProvider],
  theme: {
    colorScheme: "dark",
  },
  jwt: {
    secret: NEXTAUTH_JWT_SECRET,
  },
  callbacks: {
    session: async ({ session, token }) => ({
      ...session,
      accessToken: token.accessToken as string,
      realmId: token.realmId as string,
      user: {
        id: token.id as string,
        name: token.name as string,
        image: token.image as string,
        email: token.email as string,
      },
    }),
    async jwt({ token, account, profile }) {
      if (account && profile) {
        if (!account.access_token || !account.refresh_token || account.expires_at === undefined)
          throw new Error("Account is missing important data\naccount:" + JSON.stringify(account))

        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = Date.now() + MS_IN_HOUR
        token.id = account.providerAccountId
        token.realmId = profile.realmid

        const userInfo = await fetchJsonData<{ email: string; givenName: string }>(
          `${accountsBaseRoute}/openid_connect/userinfo`,
          token.accessToken as string
        )

        token.email = userInfo.email || "No email associated with account"
        token.name = userInfo.givenName || "No name associated with account"
        // TODO fetch profile image URL
        token.image = ""

        addUser(account.providerAccountId, token.name, token.email, profile.realmid)
      }

      if (Date.now() >= (token.accessTokenExpires as number)) return refreshAccessToken(token)
      else return token
    },
  },
}

export default NextAuth(authOptions as any)

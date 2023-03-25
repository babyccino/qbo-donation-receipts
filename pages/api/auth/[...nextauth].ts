import NextAuth from "next-auth"

import type { Account, NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { OAuthConfig } from "next-auth/providers"

import type { QBOProfile } from "../../../lib/types"
import { base64Encode } from "../../../lib/util"

const customProvider: OAuthConfig<QBOProfile> = {
  id: "QBO",
  name: "QBO",
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  type: "oauth",
  version: "2.0",
  wellKnown: process.env.WELL_KNOWN,
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
  const url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

  const encoded = base64Encode(process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET)
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
    accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
    refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
  }
}

const jwtCallback: any = async ({
  token,
  account,
  profile,
}: {
  token: JWT
  account?: Account | null
  profile?: QBOProfile | null
}): Promise<JWT> => {
  const qboProfile = profile as QBOProfile
  if (account) {
    if (!account.access_token || !account.refresh_token || account.expires_at === undefined)
      throw new Error("Account is missing important data \naccount:" + JSON.stringify(account))

    token.accessToken = account.access_token
    token.refreshToken = account.refresh_token
    token.accessTokenExpires = account.expires_at * 1000
    token.id = account.providerAccountId

    const response = await fetch(
      "https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json",
        },
      }
    )
    const qboProfile = await response.json()
    if (!response.ok) {
      throw qboProfile
    }

    token.email = qboProfile.email || "No email associated with account"
    token.name = qboProfile.givenName || "No name associated with account"
    // TODO fetch profile image URL
    token.image = ""
  }

  if (profile) {
    token.realmId = qboProfile.realmid as string
  }

  if (Date.now() >= (token.accessTokenExpires as number)) return refreshAccessToken(token)
  else return token
}

export const authOptions: NextAuthOptions = {
  providers: [customProvider],
  theme: {
    colorScheme: "dark",
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  callbacks: {
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        realmId: token.realmId,
        user: {
          id: token.id,
          name: token.name,
          image: token.image,
          email: token.email,
        },
      } as any
    },
    jwt: jwtCallback,
  },
}

export default NextAuth(authOptions as any)

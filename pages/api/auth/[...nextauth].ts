import NextAuth from "next-auth"

import type { Account, NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import type { OAuthConfig } from "next-auth/providers"

import type { QBOProfile } from "../../../lib/util"

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
    console.log(account)
    token.accessToken = account.access_token
    token.id = account.providerAccountId

    const qboProfile = await (
      await fetch("https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo", {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json",
        },
      })
    ).json()

    token.email = qboProfile.email || "No email associated with account"
    token.name = qboProfile.givenName || "No name associated with account"
    // TODO fetch profile image URL
    token.image = ""
  }

  if (profile) {
    token.realmId = qboProfile.realmid as string
  }

  return token
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

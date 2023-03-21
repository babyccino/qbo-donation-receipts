import NextAuth, { NextAuthOptions } from "next-auth"
import { OAuthConfig } from "next-auth/providers"

const customProvider: OAuthConfig<any> = {
  id: "QBO",
  name: "QBO",
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  type: "oauth",
  version: "2.0",
  wellKnown: process.env.WELL_KNOWN,
  authorization: {
    params: { scope: "openid" },
  },
  idToken: true,
  checks: ["pkce", "state"],
  profile: profile => ({
    id: profile.sub,
  }),
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
        user: {
          id: token.id,
          name: token.name,
          image: token.image,
          email: token.email,
        },
      } as any
    },
    async jwt({ token, account }) {
      if (account) {
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

        token.name = qboProfile.name || "Name not found"
        token.image = qboProfile.image || "Image not found"
        token.email = qboProfile.email || "Email not found"
      }

      return token
    },
  },
}

export default NextAuth(authOptions)

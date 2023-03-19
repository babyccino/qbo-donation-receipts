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
  profile(profile) {
    console.log("profile: ", profile)
    return {
      id: profile.sub,
    }
  },
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
    async session({ session, token, user }) {
      const newSession: any = session
      newSession.accessToken = token.accessToken
      newSession.user.id = token.id
      return newSession
    },
    async jwt({ token, user, account, profile, isNewUser }) {
      console.log("jwt callback")
      console.log("isNewUser: ", isNewUser)
      const qboProfile = await fetch(
        "https://accounts.platform.intuit.com/v1/openid_connect/userinfo",
        {
          headers: {
            Authentication: `Bearer ${account?.access_token || token?.accessToken || ""}`,
            Accept: "application/json",
          },
        }
      )

      console.log("account.access_token: ", account?.access_token)
      console.log("account ", account)
      console.log("token.accessToken: ", token.accessToken)
      console.log("qboProfile: ", qboProfile)

      if (user) {
        token.id = user.id
      }
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
  },
}

export default NextAuth(authOptions)

import NextAuth from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      name: string
      image: string
      email: string
    }
    expires: string
    accessToken: string
    connected: boolean
    realmId: string | null
  }

  interface Profile {
    realmid: string
  }
}

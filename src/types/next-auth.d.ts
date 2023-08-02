import NextAuth from "next-auth"

import { QboPermission } from "./next-auth-helper"

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
    accessToken: string | null
    qboPermission: QboPermission
    realmId: string | null
  }

  interface Profile {
    realmid: string
  }
}

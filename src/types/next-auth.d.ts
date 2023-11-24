import NextAuth from "next-auth"

import { QboPermission } from "./next-auth-helper"
import { AdapterUser, AdapterSession } from "next-auth/adapters"

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
  }

  interface Profile {
    realmid: string
  }
}

declare module "next-auth/adapters" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface AdapterSession {
    id: string
  }
}

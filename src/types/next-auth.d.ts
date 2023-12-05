import NextAuth, { Session, Profile } from "next-auth"
import { AdapterUser, AdapterSession, AdapterAccount } from "next-auth/adapters"

import { QboPermission } from "./next-auth-helper"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string
      name: string
      email: string
    }
    accountId: string | null
  }

  interface Profile {
    realmid?: string
  }
}

declare module "next-auth/adapters" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface AdapterSession {
    id: string
    accountId: string | null
  }

  interface AdapterAccount {
    id?: string | null
  }
}

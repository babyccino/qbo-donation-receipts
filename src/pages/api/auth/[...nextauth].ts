import NextAuth from "next-auth/next"
import { createAuthOptions } from "src/auth"

import { firestoreUser } from "@/lib/db"

export const authOptions = createAuthOptions(firestoreUser)
export default NextAuth(authOptions)

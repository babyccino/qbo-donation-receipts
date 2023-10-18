import NextAuth from "next-auth/next"
import { createAuthOptions } from "src/auth"

import { user } from "@/lib/db"

export const authOptions = createAuthOptions(user)
export default NextAuth(authOptions)

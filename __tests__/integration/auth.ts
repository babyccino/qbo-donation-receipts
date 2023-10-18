import { createAuthOptions } from "@/auth"

import { user } from "./db"

export const authOptions = createAuthOptions(user)

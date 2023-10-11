import { cache } from "react"

import { getUserData as _getUserData } from "@/lib/db"

export const revalidate = 100

export const getUserData = cache(_getUserData)

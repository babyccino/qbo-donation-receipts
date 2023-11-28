import Database from "better-sqlite3"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "db/schema"

const sqlite = new Database("test.db")
sqlite.pragma("journal_mode = WAL")
export const db = drizzle(sqlite, { schema })

export async function getUserData(id: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1)
  return (user ?? null) as typeof user | null
}

export async function getUserDataOrThrow(id: string) {
  const user = await getUserData(id)
  if (!user) throw new Error(`User ${id} not found`)
  return user
}

export async function getDoneeData(id: string) {
  const [donee] = await db
    .select()
    .from(schema.doneeInfos)
    .where(eq(schema.doneeInfos.userId, id))
    .limit(1)
  return (donee ?? null) as typeof donee | null
}

export async function getUserDataWithDonee(id: string) {
  const [row] = await db
    .select({ user: schema.users, doneeInfo: schema.doneeInfos })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .leftJoin(schema.doneeInfos, eq(schema.doneeInfos.userId, schema.users.id))
    .limit(1)
  return (row ?? null) as typeof row | null
}

export async function getUserDataWithDoneeOrThrow(id: string) {
  const row = await getUserDataWithDonee(id)
  if (!row) throw new Error(`User ${id} not found`)
  return row
}

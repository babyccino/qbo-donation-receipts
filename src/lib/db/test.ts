import Database from "better-sqlite3"
import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { integer } from "drizzle-orm/sqlite-core"

import { doneeInfos, users } from "db/schema"

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" }).default(sql`(cast(strftime('%s', 'now') as int) * 1000)`)

const getTimestamp = (timestamp: number | null | undefined) =>
  timestamp === null || timestamp === undefined ? null : new Date(timestamp)

const sqlite = new Database("test.db")
sqlite.pragma("journal_mode = WAL")
export const db = drizzle(sqlite)

export async function getUserData(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return (user ?? null) as typeof user | null
}

export async function getUserDataOrThrow(id: string) {
  const user = await getUserData(id)
  if (!user) throw new Error(`User ${id} not found`)
  return user
}

export async function getDoneeData(id: string) {
  const [donee] = await db.select().from(doneeInfos).where(eq(doneeInfos.userId, id)).limit(1)
  return (donee ?? null) as typeof donee | null
}

export async function getUserDataWithDonee(id: string) {
  const [row] = await db
    .select({ user: users, doneeInfo: doneeInfos })
    .from(users)
    .where(eq(users.id, id))
    .leftJoin(doneeInfos, eq(doneeInfos.userId, users.id))
    .limit(1)
  return (row ?? null) as typeof row | null
}

export async function getUserDataWithDoneeOrThrow(id: string) {
  const row = await getUserDataWithDonee(id)
  if (!row) throw new Error(`User ${id} not found`)
  return row
}

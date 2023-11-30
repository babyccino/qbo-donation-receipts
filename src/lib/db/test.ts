import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import * as schema from "db/schema"

const sqlite = createClient({ url: "file:./test.db" })
export const db = drizzle(sqlite, { schema })

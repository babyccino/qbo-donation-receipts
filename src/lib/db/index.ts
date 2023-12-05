import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import { config } from "@/lib/util/config"
import * as schema from "db/schema"

const sqlite = createClient({ url: config.libSqlDbUrl, authToken: config.libSqlAuthToken })
export const db = drizzle(sqlite, { schema })

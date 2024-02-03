import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

import { config } from "@/lib/util/config"
import * as schema from "db/schema"

const sqlite =
  config.nodeEnv === "development" || config.nodeEnv === "test" || config.playwright == "true"
    ? createClient({ url: "file:test.db" })
    : createClient({ url: config.libSqlDbUrl, authToken: config.libSqlAuthToken })
export const db = drizzle(sqlite, { schema })

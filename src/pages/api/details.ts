import { fileStorage, user } from "@/lib/db"
import { createAuthorisedHandler } from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { createHandler } from "./_details"

export default createAuthorisedHandler(authOptions, createHandler(user, fileStorage), ["POST"])

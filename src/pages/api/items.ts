import { firestoreUser } from "@/lib/db"
import { createAuthorisedHandler } from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { createHandler } from "@/api/items"

export default createAuthorisedHandler(authOptions, createHandler(firestoreUser), ["POST"])

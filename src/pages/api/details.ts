import { firebaseFileStorage, firestoreUser } from "@/lib/db"
import { createAuthorisedHandler } from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { createHandler } from "../../api/details"

export default createAuthorisedHandler(
  authOptions,
  createHandler(firestoreUser, firebaseFileStorage),
  ["POST"],
)

import { firebaseFileStorage, firestoreUser } from "@/lib/db"
import { resendEmailService } from "@/lib/resend"
import { createAuthorisedHandler } from "@/lib/util/request-server"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { createHandler } from "@/api/email"

export default createAuthorisedHandler(
  authOptions,
  createHandler(firestoreUser, firebaseFileStorage, resendEmailService),
  ["POST"],
)

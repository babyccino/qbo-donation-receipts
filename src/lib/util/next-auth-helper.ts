import { Redirect } from "next"
import { ApiError } from "next/dist/server/api-utils"
import { Session } from "next-auth"

import { QboPermission } from "@/types/next-auth-helper"

type QboConnectedSession = Session & {
  accessToken: string
  realmId: string
  qboPermission: QboPermission.Accounting
}
export const isSessionQboConnected = (session: Session): session is QboConnectedSession =>
  session.qboPermission === QboPermission.Accounting
export function assertSessionIsQboConnected(
  session: Session
): asserts session is QboConnectedSession {
  if (!isSessionQboConnected(session)) throw new ApiError(401, "user not qbo connected")
}

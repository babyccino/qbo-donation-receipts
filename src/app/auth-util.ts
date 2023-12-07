import { authOptions } from "@/auth"
import { getServerSession as _getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"

export const getServerSession = () => _getServerSession(authOptions)
export async function getServerSessionOrThrow() {
  const session = await _getServerSession(authOptions)
  if (!session) throw new ApiError(500, "session was not found")
  return session
}

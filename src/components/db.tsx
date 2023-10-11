import { Suspense } from "react"

import { getUserData } from "@/lib/db-cached"
import { User } from "@/types/db"

type userDataCb = (arg: User) => JSX.Element | null | false
export async function FromUserData({ id, children }: { id: string; children: userDataCb }) {
  const Func = async () => {
    const user = await getUserData(id)
    return children(user)
  }
  return (
    <Suspense>
      <Func />
    </Suspense>
  )
}

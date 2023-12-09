import { and, desc, eq } from "drizzle-orm"
import { Button } from "flowbite-react"
import { redirect } from "next/navigation"

import { PricingCard } from "@/components/ui"
import { db } from "@/lib/db"
import { isUserSubscribedSql } from "@/lib/stripe"
import { subscribe } from "@/lib/util/request"
import { accounts, subscriptions } from "db/schema"
import { getServerSession } from "../auth-util"

export default async function Subscribe() {
  const session = await getServerSession()
  if (!session) return redirect("subscribe")

  const subscription = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.userId, session.user.id), isUserSubscribedSql),
    orderBy: desc(accounts.updatedAt),
  })
  if (subscription) return redirect("/")

  return (
    <section className="p-4 sm:flex sm:min-h-screen sm:flex-row sm:justify-center sm:p-10">
      <div className="border-b border-solid border-slate-700 pb-8 text-white sm:border-b-0 sm:border-r sm:p-14">
        <PricingCard title="Your selected plan" plan="free" />
      </div>
      <div className="pt-8 text-white sm:p-14">
        <PricingCard
          title="Subscribe to use this feature"
          plan="pro"
          button={
            <Button
              onClick={e => {
                e.preventDefault()
                subscribe("/subscribe")
              }}
            >
              Go pro
            </Button>
          }
        />
      </div>
    </section>
  )
}

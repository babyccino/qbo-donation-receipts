import { redirect } from "next/navigation"

import { getServerSessionOrThrow } from "@/app/auth-util"
import { buttonStyling } from "@/components/link"
import { user as dbUser, getUserData } from "@/lib/db"
import { checkUserDataCompletion } from "@/lib/db-helper"
import { getItems } from "@/lib/qbo-api"
import { DateRange } from "@/lib/util/date"
import { isSessionQboConnected } from "@/lib/util/next-auth-helper"
import ClientForm from "./client"

export default async function Items() {
  const session = await getServerSessionOrThrow()
  if (!isSessionQboConnected(session)) throw new Error()

  const [user, items] = await Promise.all([
    getUserData(session.user.id),
    getItems(session.accessToken, session.realmId),
  ])
  if (!user) throw new Error("User has no corresponding db entry")
  const filledIn = checkUserDataCompletion(user)

  const { items: selectedItems, dateRange } = user

  async function formAction(formData: FormData) {
    "use server"

    const items = (formData.getAll("items") as string[]).map(item => parseInt(item))
    const startDate = new Date(formData.get("dateRange.startDate") as string)
    const endDate = new Date(formData.get("dateRange.endDate") as string)

    const set = { items, dateRange: { startDate, endDate } }
    await dbUser.doc(session!.user.id).set(set, { merge: true })

    redirect(filledIn.doneeDetails ? "/generate-receipts" : "/details")
  }

  return (
    <form
      action={formAction}
      className="m-auto flex w-full max-w-lg flex-col items-center justify-center space-y-4 p-4"
    >
      {filledIn.items ? (
        <ClientForm
          itemsFilledIn={true}
          items={items}
          dateRange={dateRange as DateRange}
          selectedItems={selectedItems as number[]}
        />
      ) : (
        <ClientForm itemsFilledIn={false} items={items} />
      )}
      <input
        className={buttonStyling + " text-l"}
        type="submit"
        value={filledIn.doneeDetails ? "Generate Receipts" : "Enter Donee Details"}
      />
    </form>
  )
}

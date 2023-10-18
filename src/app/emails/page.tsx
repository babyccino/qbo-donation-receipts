import { ApiError } from "next/dist/server/api-utils"
import { redirect } from "next/navigation"

import { getServerSessionOrThrow } from "@/app/auth-util"
import { getUserData, storageBucket } from "@/lib/db"
import {
  checkUserDataCompletion,
  downloadImagesForDonee,
  isUserDataComplete,
} from "@/lib/db-helper"
import { trimHistoryByIdAndDateRange } from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { DoneeInfo } from "@/types/db"
import ClientEmail, { AccountStatus, RecipientStatus } from "./client"

export default async function Email() {
  const session = await getServerSessionOrThrow()
  assertSessionIsQboConnected(session)

  const user = await getUserData(session.user.id)
  const { donee } = user
  if (!donee) throw new ApiError(500, "User is connected but is missing donee info in db")

  if (!isUserSubscribed(user)) return redirect("/subscribe")

  if (!isUserDataComplete(user)) {
    for (const key in donee) {
      if (donee[key as keyof DoneeInfo] === undefined) delete donee[key as keyof DoneeInfo]
    }
    return (
      <ClientEmail
        accountStatus={AccountStatus.IncompleteData}
        filledIn={checkUserDataCompletion(user)}
        donee={donee}
      />
    )
  }

  const donations = await getDonations(
    session.accessToken,
    session.realmId,
    user.dateRange,
    user.items,
  )
  const recipients = donations.map(({ id, name, email }) => ({
    id,
    name,
    status: email ? RecipientStatus.Valid : RecipientStatus.NoEmail,
  }))
  const emailHistory = user.emailHistory
    ? trimHistoryByIdAndDateRange(
        new Set(recipients.map(({ id }) => id)),
        user.dateRange,
        user.emailHistory,
      )
    : null
  return (
    <ClientEmail
      accountStatus={AccountStatus.Complete}
      donee={await downloadImagesForDonee(user.donee, storageBucket)}
      recipients={recipients}
      emailHistory={emailHistory}
    />
  )
}

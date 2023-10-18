import { ArrowRightIcon } from "@heroicons/react/24/solid"
import { Alert } from "flowbite-react"

import { getServerSessionOrThrow } from "@/app/auth-util"
import { Link } from "@/components/link"
import { MissingData } from "@/components/ui"
import { getUserData, storageBucket } from "@/lib/db"
import {
  checkUserDataCompletion,
  downloadImagesForDonee,
  isUserDataComplete,
} from "@/lib/db-helper"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { Show } from "@/lib/util/react"
import { DownloadAllFiles, Table } from "./client"

export default async function GenerateReceipts() {
  const session = await getServerSessionOrThrow()
  assertSessionIsQboConnected(session)

  const user = await getUserData(session.user.id)
  if (!isUserDataComplete(user)) return <MissingData filledIn={checkUserDataCompletion(user)} />
  const subscribed = isUserSubscribed(user)

  const [donations, donee] = await Promise.all([
    getDonations(session.accessToken, session.realmId, user.dateRange, user.items),
    downloadImagesForDonee(user.donee, storageBucket),
  ])

  return (
    <section className="flex h-full w-full flex-col p-8">
      <Show when={subscribed}>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <DownloadAllFiles />
          <div className="mb-4 flex flex-row items-baseline gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">
            <p className="inline font-normal text-gray-700 dark:text-gray-400">Email your donors</p>
            <Link href="/email">Email</Link>
          </div>
        </div>
      </Show>
      <Alert
        color="info"
        className="mb-4 sm:hidden"
        icon={() => <ArrowRightIcon className="mr-2 h-6 w-6" />}
      >
        Scroll right to view/download individual receipts
      </Alert>
      <div className="w-full overflow-x-auto overflow-y-hidden sm:rounded-lg">
        <Table
          donee={donee}
          subscribed={subscribed}
          unsortedDonations={subscribed ? donations : donations.slice(0, 3)}
        />
      </div>
    </section>
  )
}

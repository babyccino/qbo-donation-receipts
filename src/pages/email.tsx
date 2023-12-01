import {
  EnvelopeIcon,
  InformationCircleIcon as Info,
  ChevronUpIcon as UpArrow,
} from "@heroicons/react/24/solid"
import { signal } from "@preact/signals-react"
import { and, eq, gt, inArray, lt } from "drizzle-orm"
import { Alert, Button, Checkbox, Label, Modal, Toast } from "flowbite-react"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { useMemo, useState } from "react"

import { Fieldset, TextArea, Toggle } from "@/components/form"
import { EmailSentToast, MissingData } from "@/components/ui"
import { dummyEmailProps } from "@/emails/props"
import { disconnectedRedirect, signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { storageBucket } from "@/lib/db"
import { downloadImagesForDonee } from "@/lib/db-helper"
import { refreshTokenIfNeeded } from "@/lib/db/db-helper"
import { db } from "@/lib/db/test"
import { defaultEmailBody, formatEmailBody, templateDonorName, trimHistoryById } from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import { formatDateHtml } from "@/lib/util/date"
import { SerialiseDates, deSerialiseDates, dynamic, serialiseDates } from "@/lib/util/nextjs-helper"
import { Show } from "@/lib/util/react"
import { postJsonData } from "@/lib/util/request"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { EmailDataType } from "@/pages/api/email"
import { EmailProps, WithBodyProps } from "@/types/receipt"
import {
  Donation as DbDonation,
  EmailHistory as DbEmailHistory,
  accounts,
  donations as donationsSchema,
  emailHistories,
} from "db/schema"

type DoneeInfo = EmailProps["donee"]
type EmailHistory = (Pick<DbEmailHistory, "createdAt" | "startDate" | "endDate"> & {
  donations: Pick<DbDonation, "name" | "donorId">[]
})[]

const WithBody = dynamic(() => import("@/components/receipt/email").then(mod => mod.WithBody), {
  loading: () => null,
  ssr: false,
  loadImmediately: true,
})

const emailBody = signal(defaultEmailBody)
const showEmailPreview = signal(false)
const showSendEmail = signal(false)
const showEmailSentToast = signal(false)
const showEmailFailureToast = signal(false)

function EmailInput() {
  // TODO maybe save email to db with debounce?

  return (
    <Fieldset>
      <TextArea
        id="email"
        label="Your Email Template"
        defaultValue={emailBody.value}
        onChange={e => {
          emailBody.value = e.target.value
        }}
        rows={10}
      />
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Use <code>{templateDonorName}</code> to reference your donor{"'"}s name
      </p>
    </Fieldset>
  )
}

function EmailPreview({ donee }: { donee: DoneeInfo }) {
  // any donee information which has been entered by the user will overwrite the dummy data
  const emailProps: WithBodyProps = {
    ...dummyEmailProps,
    donee: { ...dummyEmailProps.donee, ...donee },
    body: formatEmailBody(emailBody.value, dummyEmailProps.donation.name),
  }

  return (
    <Modal
      dismissible
      show={showEmailPreview.value}
      onClose={() => {
        showEmailPreview.value = false
      }}
      className="bg-white"
    >
      <Modal.Body className="bg-white">
        <div className="overflow-scroll">
          <WithBody {...emailProps} body={emailBody.value} />
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-white">
        <Button
          color="blue"
          onClick={() => {
            showEmailPreview.value = false
          }}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

const EmailHistoryOverlap = ({ emailHistory }: { emailHistory: EmailHistory }) => (
  <details className="group flex w-full items-center justify-between rounded-xl border border-gray-200 p-3 text-left font-medium   text-gray-500 open:bg-gray-100 open:p-5 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-400 dark:open:bg-gray-800 dark:hover:bg-gray-800">
    <summary className="mb-2 flex items-center justify-between gap-2">
      <Info className="mr-2 h-8 w-8" />
      Your selection of donees and date range overlaps with previous campaigns
      <UpArrow className="h-5 w-5 shrink-0 group-open:rotate-180 group-open:text-gray-700 dark:group-open:text-gray-200" />
    </summary>
    <p className="font-light">
      <div className="mb-2">
        Please verify you are not receipting the same donations twice. The following campaigns have
        overlap with the current:
      </div>
      <ul>
        {emailHistory.map((entry, index) => (
          <li
            className="border-b border-gray-200 last:border-none hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 "
            key={index}
          >
            <details
              key={index}
              className="group/item flex w-full items-center justify-between p-5 text-left font-medium text-gray-500"
            >
              <summary className="flex items-center justify-between gap-2">
                {formatDateHtml(entry.createdAt)}
                <UpArrow className="h-3 w-3 shrink-0 group-open/item:rotate-180" />
              </summary>
              <div className="mt-2 font-light">
                <p className="mb-2">
                  This campaign spanned donations from <i>{formatDateHtml(entry.startDate)}</i> to{" "}
                  <i>{formatDateHtml(entry.endDate)}</i>
                </p>
                These donors will be sent receipts which overlap with the current campaign:
                <br />
                <ul className="list-inside list-disc mt-1">
                  {entry.donations.map(donation => (
                    <li key={donation.name}>{donation.name}</li>
                  ))}
                </ul>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </p>
  </details>
)

function SendEmails({
  recipients,
  emailHistory,
  realmId,
}: {
  recipients: Set<string>
  emailHistory: EmailHistory | null
  realmId: string
}) {
  const handler = async () => {
    const data: EmailDataType = {
      emailBody: emailBody.value,
      recipientIds: Array.from(recipients),
      realmId,
    }
    try {
      await postJsonData("/api/email", data)
    } catch (e) {
      if (e && typeof e === "object" && (e as any).statusCode === 429) {
        showEmailFailureToast.value = true
      }
    }
    showSendEmail.value = false
  }

  return (
    <Modal
      show={showSendEmail.value}
      size="lg"
      popup
      onClose={() => {
        showSendEmail.value = false
      }}
    >
      <Modal.Header />
      <Modal.Body>
        <div className="space-y-4 text-center">
          {emailHistory && <EmailHistoryOverlap emailHistory={emailHistory} />}
          <p className="font-normal text-gray-500 dark:text-gray-400">
            Please ensure that you confirm the accuracy of your receipts on the {'"'}Receipts{'"'}{" "}
            page prior to sending. <br />
            <br />
            Are you certain you wish to email all of your donors?
          </p>
          <div className="flex justify-center gap-4">
            <Button color="failure" onClick={handler}>
              Yes, I{"'"}m sure
            </Button>
            <Button
              color="gray"
              onClick={() => {
                showSendEmail.value = false
              }}
            >
              No, cancel
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  )
}

enum AccountStatus {
  NotSubscribed = 0,
  IncompleteData,
  Complete,
}

const defaultCustomRecipientsState = false
enum RecipientStatus {
  Valid = 0,
  NoEmail,
}
type Recipient = { name: string; donorId: string; status: RecipientStatus }
type CompleteAccountProps = {
  accountStatus: AccountStatus.Complete
  donee: DoneeInfo
  recipients: Recipient[]
  emailHistory: EmailHistory | null
  realmId: string
}
function CompleteAccountEmail({ donee, recipients, emailHistory, realmId }: CompleteAccountProps) {
  const defaultRecipients = useMemo(
    () => recipients.filter(recipient => recipient.status === RecipientStatus.Valid),
    [recipients],
  )
  const [customRecipients, setCustomRecipients] = useState(defaultCustomRecipientsState)
  const [recipientIds, setRecipientIds] = useState(
    new Set<string>(defaultRecipients.map(({ donorId }) => donorId)),
  )

  const trimmedHistory =
    customRecipients && emailHistory ? trimHistoryById(recipientIds, emailHistory) : emailHistory

  return (
    <section className="flex h-full w-full max-w-2xl flex-col justify-center gap-4 p-8 align-middle">
      <form className="space-y-4">
        <EmailInput />
        <Fieldset>
          <div className="mt-2 inline-flex items-center gap-2">
            <Checkbox
              defaultChecked={defaultCustomRecipientsState}
              id="customRecipients"
              onChange={e => setCustomRecipients(e.currentTarget.checked)}
            />
            <Label htmlFor="customRecipients">Select recipients manually</Label>
          </div>
          <hr className="my-6 h-px border-0 bg-gray-200 dark:bg-gray-700" />
          {customRecipients && (
            <div className="mt-4 sm:grid sm:grid-cols-2">
              {recipients.map(({ donorId, name, status }) => (
                <Toggle
                  key={donorId}
                  id={donorId}
                  label={name}
                  defaultChecked={status === RecipientStatus.Valid}
                  disabled={status === RecipientStatus.NoEmail}
                  onChange={e =>
                    setRecipientIds(set =>
                      e.currentTarget.checked ? set.add(donorId) : (set.delete(donorId), set),
                    )
                  }
                  size="sm"
                />
              ))}
            </div>
          )}
          {!customRecipients && defaultRecipients.length < recipients.length && (
            <div className="flex flex-col justify-center gap-6">
              <p className="text-gray-500 dark:text-gray-400">
                {recipientIds.size > 0 ? "Some" : "All"} of your users are missing emails. Please
                add emails to these users on QuickBooks if you wish to send receipts to all your
                donor.
              </p>
              <p className="text-gray-500 dark:text-gray-400">Users missing emails:</p>
              <ul className="mx-4 max-w-md list-inside list-none space-y-1 text-left text-xs text-gray-500 dark:text-gray-400 sm:columns-2">
                {recipients
                  .filter(recipient => recipient.status === RecipientStatus.NoEmail)
                  .map(recipient => (
                    <li className="truncate" key={recipient.donorId}>
                      {recipient.name}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </Fieldset>
      </form>
      <div className="mx-auto flex flex-col rounded-lg bg-white p-6 pt-5 text-center shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md">
        <div className="mb-4 flex justify-center gap-4">
          <Button
            color="blue"
            onClick={() => {
              showEmailPreview.value = true
            }}
          >
            Show Preview Email
          </Button>

          <Button
            color="blue"
            className={recipientIds.size > 0 ? "" : "line-through"}
            onClick={() => {
              showSendEmail.value = true
            }}
          >
            Send Emails
          </Button>
        </div>
        <Show when={recipientIds.size === 0}>
          <Alert color="warning" className="mb-4" icon={() => <Info className="mr-2 h-6 w-6" />}>
            You have currently have no valid recipients
          </Alert>
        </Show>
      </div>
      <EmailPreview donee={donee} />
      <SendEmails recipients={recipientIds} emailHistory={trimmedHistory} realmId={realmId} />
      {showEmailSentToast.value && (
        <EmailSentToast
          onDismiss={() => {
            showEmailSentToast.value = false
          }}
        />
      )}
      {showEmailFailureToast.value && (
        <Toast className="fixed bottom-5 right-5">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
            <EnvelopeIcon className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">
            You are only allowed 5 email campaigns within a 24 hour period on your current plan.
          </div>
          <Toast.Toggle
            onDismiss={() => {
              showEmailFailureToast.value = false
            }}
          />
        </Toast>
      )}
    </section>
  )
}

type IncompleteAccountProps = {
  accountStatus: AccountStatus.IncompleteData
  filledIn: { items: boolean; doneeDetails: boolean }
  companyName?: string
  realmId: string
}
type Props = IncompleteAccountProps | CompleteAccountProps
type SerialisedProps = SerialiseDates<Props>
export default function Email(serialisedProps: SerialisedProps) {
  const props = useMemo(() => deSerialiseDates({ ...serialisedProps }), [serialisedProps])
  if (props.accountStatus === AccountStatus.IncompleteData)
    return (
      <section className="flex h-full flex-col justify-center gap-4 p-8 align-middle">
        <MissingData filledIn={props.filledIn} realmId={props.realmId} />
        <form>
          <EmailInput />
        </form>
      </section>
    )
  else return <CompleteAccountEmail {...props} />
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<SerialisedProps> = async ({
  req,
  res,
  query,
}) => {
  const session = await getServerSession(req, res, authOptions)
  const queryRealmId = typeof query.realmid === "string" ? query.realmid : undefined
  if (!session)
    return signInRedirect("email" + (queryRealmId ? `%3FrealmId%3D${queryRealmId}` : ""))

  const account = await db.query.accounts.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: and(
      eq(accounts.userId, session.user.id),
      queryRealmId ? eq(accounts.realmId, queryRealmId) : eq(accounts.scope, "accounting"),
    ),
    columns: {
      id: true,
      accessToken: true,
      scope: true,
      realmId: true,
      createdAt: true,
      expiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
    },
    with: {
      doneeInfo: { columns: { accountId: false, createdAt: false, id: false, updatedAt: false } },
      userData: { columns: { items: true, startDate: true, endDate: true } },
    },
  })

  if (!account) throw new ApiError(500, "user not found in db")
  const { doneeInfo, userData } = account
  if (!account || account.scope !== "accounting" || !account.accessToken)
    return disconnectedRedirect
  const realmId = queryRealmId ?? account.realmId
  if (!realmId) return disconnectedRedirect
  account.realmId = realmId

  if (!doneeInfo || !userData) {
    const props: Props = {
      accountStatus: AccountStatus.IncompleteData,
      filledIn: { doneeDetails: Boolean(doneeInfo), items: Boolean(userData) },
      realmId,
    }
    doneeInfo && (props.companyName = doneeInfo.companyName)
    return { props: serialiseDates(props) }
  }

  await refreshTokenIfNeeded(account)

  // sub
  // if (!isUserSubscribed(user)) return { redirect: { permanent: false, destination: "subscribe" } }

  const donations = await getDonations(
    account.accessToken,
    realmId,
    { startDate: userData.startDate, endDate: userData.endDate },
    userData.items ? userData.items.split(",") : [],
  )
  const recipients = donations.map(({ donorId, name, email }) => ({
    donorId,
    name,
    status: email ? RecipientStatus.Valid : RecipientStatus.NoEmail,
  }))
  const recipientIds = recipients.map(({ donorId }) => donorId)

  const dateOverlap = and(
    lt(emailHistories.startDate, userData.endDate),
    gt(emailHistories.endDate, userData.startDate),
  )
  const emailHistory = (
    await db.query.emailHistories.findMany({
      columns: {
        createdAt: true,
        startDate: true,
        endDate: true,
      },
      where: dateOverlap,
      with: {
        donations: {
          columns: { name: true, donorId: true },
          where: inArray(donationsSchema.donorId, recipientIds),
        },
      },
    })
  ).filter(item => item.donations.length > 0)
  // const row = await db
  //   .select({
  //     createdAt: emailHistories.createdAt,
  //     startDate: emailHistories.startDate,
  //     endDate: emailHistories.endDate,
  //     name: donationsSchema.name,
  //   })
  //   .from(emailHistories)
  //   .innerJoin(donationsSchema, eq(emailHistories.id, donationsSchema.emailHistoryId))
  //   .where(and(dateOverlap, inArray(donationsSchema.donorId, recipientIds)))
  //   .orderBy(emailHistories.startDate, emailHistories.endDate)
  const props: Props = {
    accountStatus: AccountStatus.Complete,
    donee: await downloadImagesForDonee(doneeInfo, storageBucket),
    recipients,
    emailHistory: emailHistory.length > 0 ? emailHistory : null,
    realmId,
  }
  return {
    props: serialiseDates(props),
  }
}

import {
  EnvelopeIcon,
  InformationCircleIcon as Info,
  ChevronUpIcon as UpArrow,
} from "@heroicons/react/24/solid"
import { batch, signal } from "@preact/signals-react"
import makeChecksum from "checksum"
import { and, desc, eq, gt, inArray, isNotNull, lt } from "drizzle-orm"
import { Alert, Button, Checkbox, Label, Modal, Toast } from "flowbite-react"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { Dispatch, SetStateAction, useMemo, useState } from "react"

import { Fieldset, TextArea, Toggle } from "@/components/form"
import { LayoutProps } from "@/components/layout"
import { EmailSentToast, MissingData } from "@/components/ui"
import { dummyEmailProps } from "@/emails/props"
import { disconnectedRedirect, signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { storageBucket } from "@/lib/db/firebase"
import { downloadImagesForDonee } from "@/lib/db/db-helper"
import { refreshTokenIfNeeded } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db/test"
import { defaultEmailBody, formatEmailBody, templateDonorName, trimHistoryById } from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { formatDateHtml } from "@/lib/util/date"
import { SerialiseDates, deSerialiseDates, dynamic, serialiseDates } from "@/lib/util/nextjs-helper"
import { Show } from "@/lib/util/react"
import { postJsonData } from "@/lib/util/request"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { EmailDataType } from "@/pages/api/email"
import { EmailProps } from "@/types/receipt"
import {
  Donation as DbDonation,
  EmailHistory as DbEmailHistory,
  accounts,
  donations as donationsSchema,
  emailHistories,
  sessions,
  users,
} from "db/schema"

const WithBody = dynamic(() => import("@/components/receipt/email").then(mod => mod.WithBody), {
  loading: () => null,
  ssr: false,
  loadImmediately: true,
})

type DoneeInfo = EmailProps["donee"]
type EmailHistory = (Pick<DbEmailHistory, "createdAt" | "startDate" | "endDate"> & {
  donations: Pick<DbDonation, "name" | "donorId">[]
})[]

// global state
const emailBody = signal(defaultEmailBody)
const showEmailPreview = signal(false)
const showSendEmail = signal(false)
const showEmailSentToast = signal(false)
const showEmailFailureToast = signal(false)
const emailFailureText = signal("error")

function EmailInput() {
  // TODO maybe save email to db with debounce?
  return (
    <Fieldset>
      <TextArea
        id="email"
        label="Your Email Template"
        defaultValue={emailBody.value}
        onChange={e => (emailBody.value = e.target.value)}
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
  return (
    <Modal
      dismissible
      show={showEmailPreview.value}
      onClose={() => (showEmailPreview.value = false)}
      className="bg-white"
    >
      <Modal.Body className="bg-white">
        <div className="overflow-scroll">
          <WithBody
            {...dummyEmailProps}
            donee={{ ...dummyEmailProps.donee, ...donee }}
            body={formatEmailBody(emailBody.value, dummyEmailProps.donation.name)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-white">
        <Button color="blue" onClick={() => (showEmailPreview.value = false)}>
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

function handleError(error: ApiError) {
  switch (error.statusCode) {
    case 400:
      switch (error.message) {
        case "checksum mismatch":
          emailFailureText.value =
            "There has been a change to your accounting data. Please review your receipts again before sending."
          break
        case "data missing":
          emailFailureText.value =
            "Data is unexpectedly missing from your account. Please reload the page and try again. \
                    If this continues please contact an administrator."
        default:
          emailFailureText.value =
            "There was an unexpected client error. If this continues please contact an administrator. \
                    If this continues please contact an administrator."
      }
      showEmailFailureToast.value = true
      break
    case 401:
      switch (error.message) {
        case "not subscribed":
          emailFailureText.value =
            "There was error with your subscription. Please reload the page and try again. \
                    If this continues please contact an administrator."
          break
        default:
          emailFailureText.value =
            "There was an unexpected error with your authentication. If this continues please contact an administrator."
      }
      showEmailFailureToast.value = true
      break
    case 429:
      showEmailFailureToast.value = true
      emailFailureText.value =
        "You are only allowed 5 email campaigns within a 24 hour period on your current plan."
      break
    case 500:
      throw error
  }
}
function SendEmails({
  recipients,
  emailHistory,
  checksum,
}: {
  recipients: Set<string>
  emailHistory: EmailHistory | null
  checksum: string
}) {
  const handler = async () => {
    const data: EmailDataType = {
      emailBody: emailBody.value,
      recipientIds: Array.from(recipients),
      checksum,
    }
    try {
      await postJsonData("/api/email", data)
    } catch (error) {
      console.error(error)
      if (!(error instanceof ApiError)) throw error
      batch(() => handleError(error as ApiError))
    }
    showSendEmail.value = false
  }

  return (
    <Modal show={showSendEmail.value} size="lg" popup onClose={() => (showSendEmail.value = false)}>
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
            <Button color="gray" onClick={() => (showSendEmail.value = false)}>
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

function SelectRecipients({
  possibleRecipients,
  setSelectedRecipientIds,
}: {
  possibleRecipients: Recipient[]
  setSelectedRecipientIds: Dispatch<SetStateAction<Set<string>>>
}) {
  return (
    <div className="mt-4 sm:grid sm:grid-cols-2">
      {possibleRecipients.map(({ donorId, name, status }) => (
        <Toggle
          key={donorId}
          id={donorId}
          label={name}
          defaultChecked={status === RecipientStatus.Valid}
          disabled={status === RecipientStatus.NoEmail}
          onChange={e =>
            setSelectedRecipientIds(set =>
              e.currentTarget.checked ? set.add(donorId) : (set.delete(donorId), set),
            )
          }
          size="sm"
        />
      ))}
    </div>
  )
}

function RecipientsMissingEmails({
  selectedRecipientIds,
  possibleRecipients,
}: {
  selectedRecipientIds: Set<string>
  possibleRecipients: Recipient[]
}) {
  return (
    <div className="flex flex-col justify-center gap-6">
      <p className="text-gray-500 dark:text-gray-400">
        {selectedRecipientIds.size > 0 ? "Some" : "All"} of your users are missing emails. Please
        add emails to these users on QuickBooks if you wish to send receipts to all your donor.
      </p>
      <p className="text-gray-500 dark:text-gray-400">Users missing emails:</p>
      <ul className="mx-4 max-w-md list-inside list-none space-y-1 text-left text-xs text-gray-500 dark:text-gray-400 sm:columns-2">
        {possibleRecipients
          .filter(recipient => recipient.status === RecipientStatus.NoEmail)
          .map(recipient => (
            <li className="truncate" key={recipient.donorId}>
              {recipient.name}
            </li>
          ))}
      </ul>
    </div>
  )
}

type CompleteAccountProps = {
  accountStatus: AccountStatus.Complete
  donee: DoneeInfo
  possibleRecipients: Recipient[]
  emailHistory: EmailHistory | null
  checksum: string
}

function CompleteAccountEmail({
  donee,
  possibleRecipients,
  emailHistory,
  checksum,
}: CompleteAccountProps) {
  const defaultRecipientIds = useMemo(
    () =>
      possibleRecipients
        .filter(recipient => recipient.status === RecipientStatus.Valid)
        .map(({ donorId }) => donorId),
    [possibleRecipients],
  )
  const [customRecipients, setCustomRecipients] = useState(defaultCustomRecipientsState)
  const [selectedRecipientIds, setSelectedRecipientIds] = useState(
    new Set<string>(defaultRecipientIds),
  )

  const trimmedHistory =
    customRecipients && emailHistory
      ? trimHistoryById(selectedRecipientIds, emailHistory)
      : emailHistory

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
            <SelectRecipients
              possibleRecipients={possibleRecipients}
              setSelectedRecipientIds={setSelectedRecipientIds}
            />
          )}
          {!customRecipients && defaultRecipientIds.length < possibleRecipients.length && (
            <RecipientsMissingEmails
              selectedRecipientIds={selectedRecipientIds}
              possibleRecipients={possibleRecipients}
            />
          )}
        </Fieldset>
      </form>
      <div className="mx-auto flex flex-col rounded-lg bg-white p-6 pt-5 text-center shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md">
        <div className="flex justify-center gap-4">
          <Button color="blue" onClick={() => (showEmailPreview.value = true)}>
            Show Preview Email
          </Button>
          <Button
            color="blue"
            className={selectedRecipientIds.size > 0 ? undefined : "line-through"}
            disabled={selectedRecipientIds.size === 0}
            onClick={() => (showSendEmail.value = true)}
          >
            Send Emails
          </Button>
        </div>
        <Show when={selectedRecipientIds.size === 0}>
          <Alert color="warning" className="mb-4" icon={() => <Info className="mr-2 h-6 w-6" />}>
            You have currently have no valid recipients
          </Alert>
        </Show>
      </div>
      <EmailPreview donee={donee} />
      <SendEmails
        recipients={selectedRecipientIds}
        emailHistory={trimmedHistory}
        checksum={checksum}
      />
      {showEmailSentToast.value && (
        <EmailSentToast onDismiss={() => (showEmailSentToast.value = false)} />
      )}
      {showEmailFailureToast.value && (
        <Toast className="fixed bottom-5 right-5">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
            <EnvelopeIcon className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">{emailFailureText.value}</div>
          <Toast.Toggle onDismiss={() => (showEmailFailureToast.value = false)} />
        </Toast>
      )}
    </section>
  )
}

// --- page ---

type IncompleteAccountProps = {
  accountStatus: AccountStatus.IncompleteData
  filledIn: { items: boolean; doneeDetails: boolean }
  companyName?: string
}
type Props = (IncompleteAccountProps | CompleteAccountProps) & LayoutProps
type SerialisedProps = SerialiseDates<Props>
export default function Email(serialisedProps: SerialisedProps) {
  const props = useMemo(() => deSerialiseDates({ ...serialisedProps }), [serialisedProps])
  if (props.accountStatus === AccountStatus.IncompleteData)
    return (
      <section className="flex h-full flex-col justify-center gap-4 p-8 align-middle">
        <MissingData filledIn={props.filledIn} />
        <form>
          <EmailInput />
        </form>
      </section>
    )
  else return <CompleteAccountEmail {...props} />
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<SerialisedProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("email")

  const [user, accountList] = await Promise.all([
    db.query.users.findFirst({
      // if the realmId is specified get that account otherwise just get the first account for the user
      where: eq(users, session.user.id),
      columns: { name: true },
      with: {
        accounts: {
          where: session.accountId
            ? eq(accounts.id, session.accountId)
            : eq(accounts.scope, "accounting"),
          orderBy: desc(accounts.updatedAt),
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
            doneeInfo: {
              columns: { accountId: false, createdAt: false, id: false, updatedAt: false },
            },
            userData: { columns: { items: true, startDate: true, endDate: true } },
          },
        },
        billingAddress: { columns: { name: true } },
        subscription: {
          columns: {
            cancelAtPeriodEnd: true,
            status: true,
            createdAt: true,
            currentPeriodEnd: true,
          },
        },
      },
    }),
    db.query.accounts.findMany({
      columns: { companyName: true, id: true },
      where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
      orderBy: desc(accounts.updatedAt),
    }) as Promise<{ companyName: string; id: string }[]>,
  ])
  if (!user) throw new ApiError(500, "user not found in db")
  let account = user.accounts?.[0] as (typeof user.accounts)[number] | undefined
  if (session.accountId && !account)
    throw new ApiError(500, "account for given user and session not found in db")

  if (!account || account.scope !== "accounting" || !account.accessToken)
    return disconnectedRedirect

  // if the session does not specify an account but there is a connected account
  // then the session is connected to one of these accounts
  if (!session.accountId && account) {
    session.accountId = account.id
    await db
      .update(sessions)
      .set({ accountId: account.id })
      .where(eq(sessions.userId, session.user.id))
  }

  if (
    !account ||
    account.scope !== "accounting" ||
    !account.accessToken ||
    !account.realmId ||
    !session.accountId
  )
    return disconnectedRedirect

  if (!user.subscription || !isUserSubscribed(user.subscription))
    return { redirect: { permanent: false, destination: "subscribe" } }

  // at least one of these must be set otherwise we would have returned already
  const realmId = session.accountId as string

  const { doneeInfo, userData } = account
  if (!doneeInfo || !userData) {
    const props: Props = {
      accountStatus: AccountStatus.IncompleteData,
      filledIn: { doneeDetails: Boolean(doneeInfo), items: Boolean(userData) },
      session,
      companies: accountList,
      selectedAccountId: account.id,
    }
    if (doneeInfo) props.companyName = doneeInfo.companyName
    return { props: serialiseDates(props) }
  }

  await refreshTokenIfNeeded(account)
  const donations = await getDonations(
    account.accessToken,
    realmId,
    { startDate: userData.startDate, endDate: userData.endDate },
    userData.items ? userData.items.split(",") : [],
  )
  const possibleRecipients = donations.map(({ donorId, name, email }) => ({
    donorId,
    name,
    status: email ? RecipientStatus.Valid : RecipientStatus.NoEmail,
  }))
  const recipientIds = possibleRecipients.map(({ donorId }) => donorId)

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

  return {
    props: serialiseDates({
      accountStatus: AccountStatus.Complete,
      donee: await downloadImagesForDonee(doneeInfo, storageBucket),
      possibleRecipients,
      emailHistory: emailHistory.length > 0 ? emailHistory : null,
      checksum: makeChecksum(JSON.stringify(donations)),
      session,
      companies: accountList,
      selectedAccountId: account.id,
    } satisfies Props),
  }
}

import {
  EnvelopeIcon,
  InformationCircleIcon as Info,
  ChevronUpIcon as UpArrow,
} from "@heroicons/react/24/solid"
import makeChecksum from "checksum"
import { and, desc, eq, gt, inArray, isNotNull, lt } from "drizzle-orm"
import { Alert, Button, Checkbox, Label, Modal, Toast } from "flowbite-react"
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import { useRouter } from "next/router"
import { Dispatch, SetStateAction, useMemo, useState } from "react"

import { Fieldset, TextArea, Toggle } from "@/components/form"
import { LayoutProps } from "@/components/layout"
import { EmailSentToast, LoadingButton, MissingData } from "@/components/ui"
import { dummyEmailProps } from "@/emails/props"
import {
  disconnectedRedirect,
  refreshTokenIfNeeded,
  signInRedirect,
} from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { downloadImagesForDonee } from "@/lib/db/db-helper"
import { storageBucket } from "@/lib/db/firebase"
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
  Campaign as DbCampaigns,
  Receipt as DbReceipts,
  accounts,
  campaigns,
  receipts,
  sessions,
  users,
} from "db/schema"
import { interceptGetServerSidePropsErrors } from "@/lib/util/get-server-side-props"

const WithBody = dynamic(() => import("@/components/receipt/email").then(mod => mod.WithBody), {
  loading: () => null,
  ssr: false,
  loadImmediately: true,
})

type DoneeInfo = EmailProps["donee"]
type Campaign = Pick<DbCampaigns, "createdAt" | "startDate" | "endDate"> & {
  receipts: Pick<DbReceipts, "name" | "donorId">[]
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

// global state
const atoms = {
  emailBody: atom(defaultEmailBody),
  showEmailPreview: atom(false),
  showSendEmail: atom(false),
  showEmailSentToast: atom(false),
  showEmailFailureToast: atom(false),
  emailFailureText: atom("error"),
} as const

function EmailInput() {
  // TODO maybe save email to db with debounce?
  const setEmailBody = useSetAtom(atoms.emailBody)
  return (
    <Fieldset>
      <TextArea
        id="email"
        label="Your Email Template"
        defaultValue={defaultEmailBody}
        onChange={e => setEmailBody(e.currentTarget.value)}
        rows={10}
      />
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Use <code>{templateDonorName}</code> to reference your donor{"'"}s name
      </p>
    </Fieldset>
  )
}

const EmailPreview = ({ donee }: { donee: DoneeInfo }) => {
  const [showEmailPreview, setShowEmailPreview] = useAtom(atoms.showEmailPreview)
  const emailBody = useAtomValue(atoms.emailBody)
  return (
    <Modal
      dismissible
      show={showEmailPreview}
      onClose={() => setShowEmailPreview(false)}
      className="bg-white"
    >
      <Modal.Body className="bg-white">
        <div className="overflow-scroll">
          <WithBody
            {...dummyEmailProps}
            donee={{ ...dummyEmailProps.donee, ...donee }}
            body={formatEmailBody(emailBody, dummyEmailProps.donation.name)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-white">
        <Button color="blue" onClick={() => setShowEmailPreview(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

const CampaignOverlap = ({ campaign }: { campaign: Campaign[] }) => (
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
        {campaign.map((entry, index) => (
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
                <ul className="mt-1 list-inside list-disc">
                  {entry.receipts.map(receipt => (
                    <li key={receipt.name}>{receipt.name}</li>
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

function getErrorText(error: ApiError) {
  switch (error.statusCode) {
    case 400:
      switch (error.message) {
        case "checksum mismatch":
          return "There has been a change to your accounting data. Please review your receipts again before sending."
        case "data missing":
          return "Data is unexpectedly missing from your account. Please reload the page and try again. \
                  If this continues please contact an administrator."
        default:
          return "There was an unexpected client error. If this continues please contact an administrator. \
                  If this continues please contact an administrator."
      }
    case 401:
      switch (error.message) {
        case "not subscribed":
          return "There was error with your subscription. Please reload the page and try again. \
                  If this continues please contact an administrator."
        default:
          return "There was an unexpected error with your authentication. If this continues please contact an administrator."
      }
    case 429:
      return "You are only allowed 5 email campaigns within a 24 hour period on your current plan."
    case 500:
    default:
      throw error
  }
}

function SendEmails({
  recipients,
  campaign,
  checksum,
}: {
  recipients: Set<string>
  campaign: Campaign[] | null
  checksum: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSendEmail, setShowSendEmail] = useAtom(atoms.showSendEmail)
  const emailBody = useAtomValue(atoms.emailBody)
  const setEmailFailureTest = useSetAtom(atoms.emailFailureText)
  const setShowEmailFailureToast = useSetAtom(atoms.showEmailFailureToast)

  const handler = async () => {
    setLoading(true)
    const data: EmailDataType = {
      emailBody: emailBody,
      recipientIds: Array.from(recipients),
      checksum,
    }
    try {
      const res = await postJsonData("/api/email", data)
      if (res.campaignId) return router.push(`/campaign/${res.campaignId}`)
      setLoading(false)
      setShowSendEmail(false)
    } catch (error) {
      setLoading(false)
      console.error(error)
      if (!(error instanceof ApiError)) throw error
      const errText = getErrorText(error)
      setEmailFailureTest(errText)
      setShowEmailFailureToast(true)
      setShowSendEmail(false)
    }
  }

  return (
    <Modal show={showSendEmail} size="lg" popup onClose={() => setShowSendEmail(false)}>
      <Modal.Header />
      <Modal.Body>
        <div className="space-y-4 text-center">
          {campaign && <CampaignOverlap campaign={campaign} />}
          <p className="font-normal text-gray-500 dark:text-gray-400">
            Please ensure that you confirm the accuracy of your receipts on the {'"'}Receipts{'"'}{" "}
            page prior to sending. <br />
            <br />
            Are you certain you wish to email all of your donors?
          </p>
          <div className="flex justify-center gap-4">
            <LoadingButton loading={loading} color="failure" onClick={handler}>
              Yes, I{"'"}m sure
            </LoadingButton>
            <Button color="gray" onClick={() => setShowSendEmail(false)}>
              No, cancel
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  )
}

const SelectRecipients = ({
  possibleRecipients,
  setSelectedRecipientIds,
}: {
  possibleRecipients: Recipient[]
  setSelectedRecipientIds: Dispatch<SetStateAction<Set<string>>>
}) => (
  <div className="mt-4 sm:grid sm:grid-cols-2">
    {possibleRecipients.map(({ donorId, name, status }) => (
      <Toggle
        key={donorId}
        id={donorId}
        label={name}
        defaultChecked={status === RecipientStatus.Valid}
        disabled={status === RecipientStatus.NoEmail}
        onChange={e => {
          const checked = e.currentTarget.checked
          setSelectedRecipientIds(set => {
            const newSet = new Set(set)
            if (checked) newSet.add(donorId)
            else newSet.delete(donorId)
            return newSet
          })
        }}
        size="sm"
      />
    ))}
  </div>
)

const RecipientsMissingEmails = ({
  selectedRecipientIds,
  possibleRecipients,
}: {
  selectedRecipientIds: Set<string>
  possibleRecipients: Recipient[]
}) => (
  <div className="flex flex-col justify-center gap-6">
    <p className="text-gray-500 dark:text-gray-400">
      {selectedRecipientIds.size > 0 ? "Some" : "All"} of your users are missing emails. Please add
      emails to these users on QuickBooks if you wish to send receipts to all your donor.
    </p>
    <p className="text-gray-500 dark:text-gray-400">Users missing emails:</p>
    <ul className="mx-4 max-w-md list-inside list-none space-y-1 text-left text-xs text-gray-500 sm:columns-2 dark:text-gray-400">
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

type CompleteAccountProps = {
  accountStatus: AccountStatus.Complete
  donee: DoneeInfo
  possibleRecipients: Recipient[]
  campaign: Campaign[] | null
  checksum: string
}

function CompleteAccountEmail({
  donee,
  possibleRecipients,
  campaign,
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
  const setShowEmailPreview = useSetAtom(atoms.showEmailPreview)
  const setShowSendEmail = useSetAtom(atoms.showSendEmail)
  const [showEmailSentToast, setShowEmailSentToast] = useAtom(atoms.showEmailSentToast)
  const [showEmailFailureToast, setShowEmailFailureToast] = useAtom(atoms.showEmailFailureToast)
  const emailFailureText = useAtomValue(atoms.emailFailureText)

  const trimmedHistory =
    customRecipients && campaign ? trimHistoryById(selectedRecipientIds, campaign) : campaign

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
      <div className="mx-auto flex flex-col rounded-lg bg-white p-6 pt-5 text-center shadow sm:max-w-md dark:border dark:border-gray-700 dark:bg-gray-800">
        <div className="flex justify-center gap-4">
          <Button color="blue" onClick={() => setShowEmailPreview(true)}>
            Show Preview Email
          </Button>
          <Button
            color="blue"
            className={selectedRecipientIds.size > 0 ? undefined : "line-through"}
            disabled={selectedRecipientIds.size === 0}
            onClick={() => setShowSendEmail(true)}
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
      <SendEmails recipients={selectedRecipientIds} campaign={trimmedHistory} checksum={checksum} />
      {showEmailSentToast && <EmailSentToast onDismiss={() => setShowEmailSentToast(false)} />}
      {showEmailFailureToast && (
        <Toast className="fixed bottom-5 right-5">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
            <EnvelopeIcon className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">{emailFailureText}</div>
          <Toast.Toggle onDismiss={() => setShowEmailFailureToast(false)} />
        </Toast>
      )}
    </section>
  )
}

// --- page --- //

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

// --- server side props --- //

const _getServerSideProps: GetServerSideProps<SerialisedProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("email")

  const [user, accountList] = await Promise.all([
    db.query.users.findFirst({
      // if the realmId is specified get that account otherwise just get the first account for the user
      where: eq(users.id, session.user.id),
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
    account.realmId,
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
    lt(campaigns.startDate, userData.endDate),
    gt(campaigns.endDate, userData.startDate),
    eq(campaigns.accountId, account.id),
  )
  const campaign = (
    await db.query.campaigns.findMany({
      columns: {
        createdAt: true,
        startDate: true,
        endDate: true,
      },
      where: dateOverlap,
      with: {
        receipts: {
          columns: { name: true, donorId: true },
          where: inArray(receipts.donorId, recipientIds),
        },
      },
    })
  ).filter(item => item.receipts.length > 0)

  return {
    props: serialiseDates({
      accountStatus: AccountStatus.Complete,
      donee: await downloadImagesForDonee(doneeInfo, storageBucket),
      possibleRecipients,
      checksum: makeChecksum(JSON.stringify(donations)),
      session,
      companies: accountList,
      selectedAccountId: account.id,
      campaign: campaign.length > 0 ? campaign : null,
    } satisfies Props),
  }
}
export const getServerSideProps = interceptGetServerSidePropsErrors(_getServerSideProps)

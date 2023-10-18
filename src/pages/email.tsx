import { InformationCircleIcon as Info, ChevronUpIcon as UpArrow } from "@heroicons/react/24/solid"
import { Alert, Button, Checkbox, Label, Modal } from "flowbite-react"
import { GetServerSideProps } from "next"
import { ApiError } from "next/dist/server/api-utils"
import { Dispatch, SetStateAction, createContext, useContext, useMemo, useState } from "react"

import { Fieldset, TextArea, Toggle } from "@/components/form"
import { EmailSentToast, MissingData } from "@/components/ui"
import { dummyEmailProps } from "@/emails/props"
import { fileStorage, user } from "@/lib/db"
import {
  checkUserDataCompletion,
  downloadImagesForDonee,
  isUserDataComplete,
} from "@/lib/db/db-helper"
import {
  formatEmailBody,
  makeDefaultEmailBody,
  templateDonorName,
  trimHistoryById,
  trimHistoryByIdAndDateRange,
} from "@/lib/email"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { formatDateHtml } from "@/lib/util/date"
import { assertSessionIsQboConnected } from "@/lib/util/next-auth-helper"
import { getServerSessionOrThrow } from "@/lib/util/next-auth-helper-server"
import { SerialiseDates, deSerialiseDates, dynamic, serialiseDates } from "@/lib/util/nextjs-helper"
import { Show } from "@/lib/util/react"
import { postJsonData } from "@/lib/util/request"
import { EmailDataType } from "@/pages/api/email"
import { DoneeInfo, EmailHistoryItem } from "@/types/db"
import { WithBodyProps } from "@/types/receipt"

const WithBody = dynamic(() => import("@/components/receipt/email").then(mod => mod.WithBody), {
  loading: () => null,
  ssr: false,
  loadImmediately: true,
})

type EmailContext = {
  emailBody: string
  setEmailBody: Dispatch<SetStateAction<string>>
}
const EmailContext = createContext<EmailContext>({
  emailBody: "",
  setEmailBody: () => {},
})

function EmailInput() {
  const { emailBody, setEmailBody } = useContext(EmailContext)

  // TODO maybe save email to db with debounce?

  return (
    <Fieldset>
      <TextArea
        id="email"
        label="Your Email Template"
        defaultValue={emailBody}
        onChange={e => {
          setEmailBody(e.currentTarget.value)
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
  const [showModal, setShowModal] = useState(false)
  const { emailBody } = useContext(EmailContext)

  // any donee information which has been entered by the user will overwrite the dummy data
  const emailProps: WithBodyProps = {
    ...dummyEmailProps,
    donee: { ...dummyEmailProps.donee, ...donee },
    body: formatEmailBody(emailBody, dummyEmailProps.donation.name),
  }

  return (
    <>
      <Button color="blue" onClick={() => setShowModal(true)}>
        Show Preview Email
      </Button>
      <Modal dismissible show={showModal} onClose={() => setShowModal(false)} className="bg-white">
        <Modal.Body className="bg-white">
          <div className="overflow-scroll">
            <WithBody {...emailProps} body={emailBody} />
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-white">
          <Button color="blue" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      <button onClick={e => e.currentTarget.value}></button>
    </>
  )
}

const EmailHistoryOverlap = ({ emailHistory }: { emailHistory: EmailHistoryItem[] }) => (
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
                {formatDateHtml(entry.timeStamp)}
                <UpArrow className="h-3 w-3 shrink-0 group-open/item:rotate-180" />
              </summary>
              <div className="mt-2 font-light">
                <p className="mb-2">
                  This campaign spanned donations from{" "}
                  <i>{formatDateHtml(entry.dateRange.startDate)}</i> to{" "}
                  <i>{formatDateHtml(entry.dateRange.endDate)}</i>
                </p>
                Donors:
                <br />
                <ul className="list-inside list-disc">
                  {entry.donations.map(donation => (
                    <li key={donation.id}>{donation.name}</li>
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
}: {
  recipients: Set<number>
  emailHistory: EmailHistoryItem[] | null
}) {
  const [showModal, setShowModal] = useState(false)
  const [showEmailSentToast, setShowEmailSentToast] = useState(false)
  const { emailBody } = useContext(EmailContext)

  const handler = async () => {
    const data: EmailDataType = {
      emailBody: emailBody,
      recipientIds: Array.from(recipients),
    }
    await postJsonData("/api/email", data)
    setShowModal(false)
  }

  return (
    <Button
      color="blue"
      className={recipients.size > 0 ? "" : "line-through"}
      onClick={() => setShowModal(true)}
    >
      Send Emails
      <Modal show={showModal} size="lg" popup onClose={() => setShowModal(false)}>
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
              <Button color="gray" onClick={() => (console.log("hi"), setShowModal(false))}>
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
      {showEmailSentToast && <EmailSentToast onDismiss={() => setShowEmailSentToast(false)} />}
    </Button>
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
type Recipient = { name: string; id: number; status: RecipientStatus }
type CompleteAccountProps = {
  accountStatus: AccountStatus.Complete
  donee: DoneeInfo
  recipients: Recipient[]
  emailHistory: EmailHistoryItem[] | null
}
function CompleteAccountEmail({ donee, recipients, emailHistory }: CompleteAccountProps) {
  const defaultRecipients = useMemo(
    () => recipients.filter(recipient => recipient.status === RecipientStatus.Valid),
    [recipients],
  )
  const [customRecipients, setCustomRecipients] = useState(defaultCustomRecipientsState)
  const [recipientIds, setRecipientIds] = useState(
    new Set<number>(defaultRecipients.map(({ id }) => id)),
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
              {recipients.map(({ id, name, status }) => (
                <Toggle
                  key={id}
                  id={id}
                  label={name}
                  defaultChecked={status === RecipientStatus.Valid}
                  disabled={status === RecipientStatus.NoEmail}
                  onChange={e =>
                    setRecipientIds(set =>
                      e.currentTarget.checked ? set.add(id) : (set.delete(id), set),
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
                    <li className="truncate" key={recipient.id}>
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
          <EmailPreview donee={donee} />
          <SendEmails recipients={recipientIds} emailHistory={trimmedHistory} />
        </div>
        <Show when={recipientIds.size === 0}>
          <Alert color="warning" className="mb-4" icon={() => <Info className="mr-2 h-6 w-6" />}>
            You have currently have no valid recipients
          </Alert>
        </Show>
      </div>
    </section>
  )
}

type IncompleteAccountProps = {
  accountStatus: AccountStatus.IncompleteData
  filledIn: { items: boolean; doneeDetails: boolean }
  donee: DoneeInfo
}
type Props = IncompleteAccountProps | CompleteAccountProps
type SerialisedProps = SerialiseDates<Props>
export default function Email(serialisedProps: SerialisedProps) {
  const props = useMemo(() => deSerialiseDates({ ...serialisedProps }), [serialisedProps])
  const defaultEmailBody = makeDefaultEmailBody(props.donee.companyName)
  const [emailBody, setEmailBody] = useState(defaultEmailBody)
  return (
    <EmailContext.Provider value={{ emailBody, setEmailBody }}>
      {props.accountStatus === AccountStatus.IncompleteData ? (
        <section className="flex h-full flex-col justify-center gap-4 p-8 align-middle">
          <MissingData filledIn={props.filledIn} />
          <form>
            <EmailInput />
          </form>
        </section>
      ) : (
        <CompleteAccountEmail {...props} />
      )}
    </EmailContext.Provider>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<SerialisedProps> = async ({ req, res }) => {
  const session = await getServerSessionOrThrow(req, res)
  assertSessionIsQboConnected(session)

  const userData = await user.getOrThrow(session.user.id)
  if (!userData.donee) throw new ApiError(500, "User is connected but is missing donee info in db")

  if (!isUserSubscribed(userData))
    return { redirect: { permanent: false, destination: "subscribe" } }
  if (!isUserDataComplete(userData)) {
    const { donee } = userData
    for (const key in donee) {
      if (donee[key as keyof DoneeInfo] === undefined) delete donee[key as keyof DoneeInfo]
    }
    return {
      props: {
        accountStatus: AccountStatus.IncompleteData,
        filledIn: checkUserDataCompletion(userData),
        donee,
      },
    }
  }

  const donations = await getDonations(
    session.accessToken,
    session.realmId,
    userData.dateRange,
    userData.items,
  )
  const recipients = donations.map(({ id, name, email }) => ({
    id,
    name,
    status: email ? RecipientStatus.Valid : RecipientStatus.NoEmail,
  }))
  const props: Props = {
    accountStatus: AccountStatus.Complete,
    donee: await downloadImagesForDonee(session.user.id, userData.donee, fileStorage),
    recipients,
    emailHistory: userData.emailHistory
      ? trimHistoryByIdAndDateRange(
          new Set(recipients.map(({ id }) => id)),
          userData.dateRange,
          userData.emailHistory,
        )
      : null,
  }
  return {
    props: serialiseDates(props),
  }
}

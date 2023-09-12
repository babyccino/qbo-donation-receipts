import { Dispatch, SetStateAction, createContext, useContext, useMemo, useState } from "react"
import { GetServerSideProps } from "next"
import { Alert, Button, Checkbox, Label, Modal } from "flowbite-react"

import { postJsonData, subscribe } from "@/lib/util/request"
import { MissingData, PricingCard, Svg } from "@/components/ui"
import { Fieldset, TextArea, Toggle } from "@/components/form"
import { getUserData, storageBucket } from "@/lib/db"
import { UserDataComplete, checkUserDataCompletion, isUserDataComplete } from "@/lib/db-helper"
import { disconnectedRedirect } from "@/lib/util/next-auth-helper-server"
import { DoneeInfo, EmailHistoryItem } from "@/types/db"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { dummyEmailProps } from "@/emails/receipt"
import { WithBody, WithBodyProps } from "@/components/receipt"
import { downloadImagesForDonee } from "@/lib/db-helper"
import { EmailDataType } from "@/pages/api/email"
import { doDateRangesIntersect } from "@/lib/util/date"
import { SerialiseDates, deSerialiseDates, serialiseDates } from "@/lib/util/nextjs-helper"
import { Show } from "@/lib/util/react"
import { formatEmailBody, makeDefaultEmailBody, templateDonorName } from "@/lib/email"
import {
  assertSessionIsQboConnected,
  getServerSessionOrThrow,
} from "@/lib/util/next-auth-helper-server"
import { ApiError } from "next/dist/server/api-utils"

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
      <Button onClick={() => setShowModal(true)}>Show Preview Email</Button>
      <Modal dismissible show={showModal} onClose={() => setShowModal(false)} className="bg-white">
        <Modal.Body className="bg-white">
          <div className="overflow-scroll">
            <WithBody {...emailProps} body={emailBody} />
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-white">
          <Button onClick={() => setShowModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

function SendEmails({ recipients }: { recipients: Set<number> }) {
  const [showModal, setShowModal] = useState(false)
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
    <>
      <Button
        className={recipients.size > 0 ? "" : "line-through"}
        onClick={() => setShowModal(true)}
      >
        Send Emails
      </Button>
      <Modal show={showModal} size="md" popup onClose={() => setShowModal(false)}>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            {/*<HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />*/}
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Please ensure that you confirm the accuracy of your receipts on the {'"'}Receipts{'"'}{" "}
              page prior to sending. Are you certain you wish to email all of your donors?
            </h3>
            <div className="flex justify-center gap-4">
              <Button color="failure" onClick={handler}>
                Yes, I{"'"}m sure
              </Button>
              <Button color="gray" onClick={() => setShowModal(false)}>
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
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
function CompleteAccountEmail({ donee, recipients }: CompleteAccountProps) {
  const defaultRecipients = useMemo(
    () => recipients.filter(recipient => recipient.status === RecipientStatus.Valid),
    [recipients],
  )
  const [customRecipients, setCustomRecipients] = useState(defaultCustomRecipientsState)
  const [recipientIds, setRecipientIds] = useState<Set<number>>(
    new Set(defaultRecipients.map(({ id }) => id)),
  )

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
          <SendEmails recipients={recipientIds} />
        </div>
        <Show when={recipientIds.size === 0}>
          <Alert
            color="warning"
            className="mb-4"
            icon={() => (
              <div className="mr-2 h-6 w-6">
                <Svg.Info />
              </div>
            )}
          >
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

function getEmailHistory(user: UserDataComplete): EmailHistoryItem[] | null {
  if (!user.emailHistory) return null

  const relevantEmailHistory = user.emailHistory.filter(entry =>
    doDateRangesIntersect(entry.dateRange, user.dateRange),
  )
  if (relevantEmailHistory.length === 0) return null
  else return relevantEmailHistory
}

export const getServerSideProps: GetServerSideProps<SerialisedProps> = async ({ req, res }) => {
  const session = await getServerSessionOrThrow(req, res)
  assertSessionIsQboConnected(session)

  const user = await getUserData(session.user.id)
  if (!user.donee) throw new ApiError(500, "User is connected but is missing donee info in db")

  if (!isUserSubscribed(user)) return { redirect: { permanent: false, destination: "subscribe" } }
  if (!isUserDataComplete(user)) {
    const { donee } = user
    for (const key in donee) {
      if (donee[key as keyof DoneeInfo] === undefined) delete donee[key as keyof DoneeInfo]
    }
    return {
      props: {
        accountStatus: AccountStatus.IncompleteData,
        filledIn: checkUserDataCompletion(user),
        donee,
      },
    }
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
  const props: Props = {
    accountStatus: AccountStatus.Complete,
    donee: await downloadImagesForDonee(user.donee, storageBucket),
    recipients,
    emailHistory: getEmailHistory(user),
  }
  return {
    props: serialiseDates(props),
  }
}

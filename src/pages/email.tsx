import { Dispatch, SetStateAction, createContext, useContext, useMemo, useState } from "react"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { Alert, Button, Checkbox, Label, Modal } from "flowbite-react"

import { authOptions } from "./api/auth/[...nextauth]"
import { postJsonData } from "@/lib/util/request"
import { MissingData, Svg } from "@/components/ui"
import { Fieldset, TextArea, Toggle } from "@/components/form"
import { getUserData, storageBucket } from "@/lib/db"
import { UserDataComplete, checkUserDataCompletion, isUserDataComplete } from "@/lib/db-helper"
import { disconnectedRedirect, isSessionQboConnected } from "@/lib/util/next-auth-helper"
import { DoneeInfo, EmailHistoryItem } from "@/types/db"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { dummyEmailProps } from "@/emails/receipt"
import { WithBody, WithBodyProps } from "@/components/receipt"
import { downloadImagesForDonee } from "@/lib/db-helper"
import { EmailDataType } from "@/pages/api/email"
import { doDateRangesIntersect, getThisYear } from "@/lib/util/date"
import { SerialiseDates, deSerialiseDates, serialiseDates } from "@/lib/util/nextjs-helper"
import { Show } from "@/lib/util/react"
import { formatEmailBody, templateDonorName } from "@/lib/email"

const makeDefaultEmailBody = (orgName: string) => `Dear ${templateDonorName},

We hope this message finds you in good health and high spirits. On behalf of ${orgName}, we would like to extend our heartfelt gratitude for your recent contribution. Your generosity and support play a vital role in our mission to [state the mission or purpose of the organization].

With your continued support, we will be able to [describe how the funds will be utilized or the impact they will make]. Your contribution makes a significant difference in the lives of those we serve, and we are deeply grateful for your commitment to our cause.

We believe that true change is made possible through collective efforts, and your support exemplifies the power of individuals coming together for a common purpose. Together, we are making a positive impact and bringing hope to those in need.

Once again, we express our sincerest appreciation for your contribution. It is donors like you who inspire us to continue our work and strive for greater achievements. We are honored to have you as part of our compassionate community.

If you have any questions or would like further information about our organization and how your donation is being utilized, please feel free to reach out to us. We value your feedback and involvement.

Thank you once again for your generosity, compassion, and belief in our mission.

Attached is your Income Tax Receipt for the ${getThisYear()} taxation year.

With gratitude,`

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

// Rust enums would be v nice
enum AccountStatus {
  IncompleteData = 0,
  Complete,
}
type IncompleteAccountProps = {
  accountStatus: AccountStatus.IncompleteData
  filledIn: { items: boolean; doneeDetails: boolean }
  donee: DoneeInfo
}

function IncompleteAccountEmail({ donee, filledIn }: IncompleteAccountProps) {
  return (
    <section className="flex h-full flex-col justify-center gap-4 p-8 align-middle">
      <MissingData filledIn={filledIn} />
      <form>
        <EmailInput />
      </form>
    </section>
  )
}

enum EmailHistoryStatus {
  NoIntersection = 0,
  HasIntersection,
}
enum RecipientStatus {
  Valid = 0,
  NoEmail,
}
type EmailHistory =
  | {
      status: EmailHistoryStatus.NoIntersection
    }
  | { status: EmailHistoryStatus.HasIntersection; relevantEmailHistory: EmailHistoryItem[] }
type Recipient = { name: string; id: number; status: RecipientStatus }
type CompleteAccountProps = {
  accountStatus: AccountStatus.Complete
  donee: DoneeInfo
  recipients: Recipient[]
  emailHistory: EmailHistory
}
const defaultCustomRecipientsState = false
const isRecipientValid = (
  recipient: Recipient
): recipient is Recipient & { status: RecipientStatus.Valid } =>
  recipient.status === RecipientStatus.Valid
function CompleteAccountEmail({ donee, recipients }: CompleteAccountProps) {
  const defaultRecipients = useMemo(() => recipients.filter(isRecipientValid), [recipients])
  const [customRecipients, setCustomRecipients] = useState(defaultCustomRecipientsState)
  const [recipientIds, setRecipientIds] = useState<Set<number>>(
    new Set(defaultRecipients.map(({ id }) => id))
  )

  return (
    <section className="flex h-full w-full max-w-2xl flex-col justify-center gap-4 p-8 align-middle">
      <form className="space-y-4">
        <EmailInput />
        <Fieldset>
          <div className="inline-flex items-center gap-2">
            <Checkbox
              defaultChecked={defaultCustomRecipientsState}
              id="customRecipients"
              onChange={e => setCustomRecipients(e.currentTarget.checked)}
            />
            <Label htmlFor="customRecipients">Select recipients manually</Label>
          </div>
          <Show when={customRecipients}>
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
                      e.currentTarget.checked ? set.add(id) : (set.delete(id), set)
                    )
                  }
                  size="sm"
                />
              ))}
            </div>
          </Show>
          <Show when={!customRecipients && defaultRecipients.length < recipients.length}>
            <hr className="my-8 h-px border-0 bg-gray-200 dark:bg-gray-700" />
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
          </Show>
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

type Props = IncompleteAccountProps | CompleteAccountProps
type SerialisedProps = SerialiseDates<Props>

export default function Email(serialisedProps: SerialisedProps) {
  const props: Props = useMemo(() => deSerialiseDates({ ...serialisedProps }), [serialisedProps])
  const defaultEmailBody = makeDefaultEmailBody(props.donee.companyName)
  const [emailBody, setEmailBody] = useState(defaultEmailBody)
  return (
    <EmailContext.Provider value={{ emailBody, setEmailBody }}>
      {props.accountStatus === AccountStatus.IncompleteData ? (
        <IncompleteAccountEmail {...props} />
      ) : (
        <CompleteAccountEmail {...props} />
      )}
    </EmailContext.Provider>
  )
}

// --- server-side props ---

function getEmailHistory(user: UserDataComplete): EmailHistory {
  if (!user.emailHistory) return { status: EmailHistoryStatus.NoIntersection }

  const relevantEmailHistory = user.emailHistory.filter(entry =>
    doDateRangesIntersect(entry.dateRange, user.dateRange)
  )
  if (relevantEmailHistory.length === 0) return { status: EmailHistoryStatus.NoIntersection }
  else return { status: EmailHistoryStatus.HasIntersection, relevantEmailHistory }
}

export const getServerSideProps: GetServerSideProps<SerialisedProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) throw new Error("Couldn't find session")
  if (!isSessionQboConnected(session)) return disconnectedRedirect

  const user = await getUserData(session.user.id)
  if (!user.donee) return disconnectedRedirect

  if (!isUserSubscribed(user)) return { redirect: { permanent: false, destination: "/account" } }
  if (!isUserDataComplete(user)) {
    const { donee } = user
    delete donee.signature
    delete donee.smallLogo
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
    user.items
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

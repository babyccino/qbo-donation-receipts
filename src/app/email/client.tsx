"use client"

import {
  EnvelopeIcon,
  InformationCircleIcon as Info,
  ChevronUpIcon as UpArrow,
} from "@heroicons/react/24/solid"
import { Alert, Button, Checkbox, Label, Modal, Toast } from "flowbite-react"
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai"
import { ApiError } from "next/dist/server/api-utils"
import dynamic from "next/dynamic"
import { Dispatch, SetStateAction, useMemo, useState } from "react"

import { Fieldset, TextArea, Toggle } from "@/components/form-server"
import { EmailSentToast } from "@/components/ui"
import { dummyEmailProps } from "@/emails/props"
import { defaultEmailBody, formatEmailBody, templateDonorName, trimHistoryById } from "@/lib/email"
import { formatDateHtml } from "@/lib/util/date"
import { Show } from "@/lib/util/react"
import { postJsonData } from "@/lib/util/request"
import { EmailDataType } from "@/pages/api/email"
import { EmailProps } from "@/types/receipt"
import { Donation as DbDonation, EmailHistory as DbEmailHistory } from "db/schema"

const WithBody = dynamic(() => import("@/components/receipt/email").then(mod => mod.WithBody), {
  loading: () => null,
  ssr: false,
})

type DoneeInfo = EmailProps["donee"]
type EmailHistory = Pick<DbEmailHistory, "createdAt" | "startDate" | "endDate"> & {
  donations: Pick<DbDonation, "name" | "donorId">[]
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

export function EmailInput() {
  // TODO maybe save email to db with debounce?
  const setEmailBody = useSetAtom(atoms.emailBody)
  return (
    <Fieldset>
      <TextArea
        id="email"
        label="Your Email Template"
        defaultValue={defaultEmailBody}
        onChange={e => setEmailBody(e.target.value)}
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

const EmailHistoryOverlap = ({ emailHistory }: { emailHistory: EmailHistory[] }) => (
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
  emailHistory,
  checksum,
}: {
  recipients: Set<string>
  emailHistory: EmailHistory[] | null
  checksum: string
}) {
  const emailBody = useAtomValue(atoms.emailBody)
  const [showSendEmail, setShowSendEmail] = useAtom(atoms.showSendEmail)
  const setEmailFailureTest = useSetAtom(atoms.emailFailureText)
  const setShowEmailFailureToast = useSetAtom(atoms.showEmailFailureToast)

  const handler = async () => {
    const data: EmailDataType = {
      emailBody: emailBody,
      recipientIds: Array.from(recipients),
      checksum,
    }
    try {
      await postJsonData("/api/email", data)
      setShowSendEmail(false)
    } catch (error) {
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

export function CompleteAccountEmail({
  donee,
  possibleRecipients,
  emailHistory,
  checksum,
}: {
  donee: DoneeInfo
  possibleRecipients: Recipient[]
  emailHistory: EmailHistory[] | null
  checksum: string
}) {
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
      <SendEmails
        recipients={selectedRecipientIds}
        emailHistory={trimmedHistory}
        checksum={checksum}
      />
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

import { useState } from "react"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { Button, Modal } from "flowbite-react"

import { authOptions } from "./api/auth/[...nextauth]"
import { postJsonData } from "@/lib/util/request"
import { MissingData } from "@/components/ui"
import { Fieldset, TextArea } from "@/components/form"
import { user } from "@/lib/db"
import { alreadyFilledIn, isSessionQboConnected, receiptReady } from "@/lib/app-api"
import { DoneeInfo } from "@/types/db"
import { getDonations } from "@/lib/qbo-api"
import { isUserSubscribed } from "@/lib/stripe"
import { dummyEmailProps } from "@/emails/receipt"
import { WithBody, WithBodyProps } from "@/components/receipt"
import { downloadImagesForDonee } from "@/lib/db-helper"
import { DataType as EmailDataType } from "@/pages/api/email"

// Rust enums would be v nice
enum AccountStatus {
  IncompleteData = 0,
  Complete,
}
type Props =
  | {
      status: AccountStatus.IncompleteData
      filledIn: { items: boolean; doneeDetails: boolean }
      donee: DoneeInfo
    }
  | {
      status: AccountStatus.Complete
      donee: DoneeInfo
      noEmails: string[]
    }

function EmailPreview({ props }: { props: WithBodyProps }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button onClick={() => setShowModal(true)}>Show Preview Email</Button>
      <Modal dismissible show={showModal} onClose={() => setShowModal(false)} className="bg-white">
        <Modal.Body className="bg-white">
          <div className="overflow-scroll">
            <WithBody {...props} />
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-white">
          <Button onClick={() => setShowModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

const templateDonorName = "FULL_NAME"
const makeDefaultEmailBody = (orgName: string) => `Dear ${templateDonorName},

We hope this message finds you in good health and high spirits. On behalf of ${orgName}, we would like to extend our heartfelt gratitude for your recent contribution. Your generosity and support play a vital role in our mission to [state the mission or purpose of the organization].

With your continued support, we will be able to [describe how the funds will be utilized or the impact they will make]. Your contribution makes a significant difference in the lives of those we serve, and we are deeply grateful for your commitment to our cause.

We believe that true change is made possible through collective efforts, and your support exemplifies the power of individuals coming together for a common purpose. Together, we are making a positive impact and bringing hope to those in need.

Once again, we express our sincerest appreciation for your contribution. It is donors like you who inspire us to continue our work and strive for greater achievements. We are honored to have you as part of our compassionate community.

If you have any questions or would like further information about our organization and how your donation is being utilized, please feel free to reach out to us. We value your feedback and involvement.

Thank you once again for your generosity, compassion, and belief in our mission.

Attached is your Income Tax Receipt for the ${new Date().getFullYear()} taxation year.

With gratitude,`
const formatEmailBody = (str: string, donorName: string) =>
  str.replaceAll(templateDonorName, donorName)

function SendEmails({ emailBody }: { emailBody: string }) {
  const [showModal, setShowModal] = useState(false)

  const handler = async () => {
    const data: EmailDataType = {
      emailBody,
    }
    await postJsonData("/api/email", data)
    setShowModal(false)
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>Send Emails</Button>
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

export default function Email(props: Props) {
  const { donee, status } = props
  const defaultEmailBody = makeDefaultEmailBody(donee.companyName)
  const [emailBody, setEmailBody] = useState(defaultEmailBody)

  // any donee information which has been entered by the user will overwrite the dummy data
  const emailProps: WithBodyProps = {
    ...dummyEmailProps,
    donee: { ...dummyEmailProps.donee, ...donee },
    body: formatEmailBody(emailBody, dummyEmailProps.donation.name),
  }

  const showNoEmailsList = status === AccountStatus.Complete && props.noEmails.length > 0

  return (
    <section className="flex h-full flex-col justify-center gap-4 p-8 align-middle">
      {status === AccountStatus.IncompleteData && <MissingData filledIn={props.filledIn} />}
      <form>
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
      </form>
      {status === AccountStatus.Complete && (
        <div className="mx-auto flex flex-col rounded-lg bg-white p-6 pt-5 text-center shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md">
          <div className="flex justify-center gap-4">
            <EmailPreview props={emailProps} />
            <SendEmails emailBody={emailBody} />
          </div>
          {showNoEmailsList && (
            <>
              <hr className="my-8 h-px border-0 bg-gray-200 dark:bg-gray-700" />
              <div className="flex flex-col justify-center gap-6">
                <p className="text-gray-500 dark:text-gray-400">
                  Some of your users are missing emails. Please add emails to these users on
                  QuickBooks if you wish to send receipts to all your donors. Users missing emails:
                </p>
                {/*<ShowUsers noEmails={props.noEmails} />*/}
                <ul className="mx-4 max-w-md list-inside list-none space-y-1 text-left text-xs text-gray-500 dark:text-gray-400 sm:columns-2">
                  {props.noEmails.map(user => (
                    <li key={user}>{user}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) throw new Error("Couldn't find session")
  if (!isSessionQboConnected(session))
    return {
      redirect: { destination: "/auth/disconnected" },
      props: {} as any,
    }

  const doc = await user.doc(session.user.id).get()
  const dbUser = doc.data()

  if (!dbUser) throw new Error("No user data found in database")

  if (!isUserSubscribed(dbUser)) return { redirect: { permanent: false, destination: "/account" } }
  if (!receiptReady(dbUser)) {
    const { donee } = dbUser
    delete donee.signature
    delete donee.smallLogo
    return {
      props: {
        status: AccountStatus.IncompleteData,
        filledIn: alreadyFilledIn(dbUser),
        donee,
      },
    }
  }

  const donations = await getDonations(
    session.accessToken,
    session.realmId,
    dbUser.date,
    dbUser.items
  )
  const noEmails = donations.filter(entry => entry.email === null).map(entry => entry.name)
  return {
    props: {
      status: AccountStatus.Complete,
      donee: await downloadImagesForDonee(dbUser.donee),
      noEmails,
    },
  }
}

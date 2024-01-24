import { accounts, sessions } from "db/schema"
import { and, eq, isNotNull } from "drizzle-orm"
import { Label, TextInput, Textarea } from "flowbite-react"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { FormEventHandler, useRef, useState } from "react"

import { LayoutProps } from "@/components/layout"
import { EmailSentToast, LoadingSubmitButton } from "@/components/ui"
import { signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { db } from "@/lib/db"
import { postJsonData } from "@/lib/util/request"
import { DataType as ContactDataType } from "@/pages/api/support"
import { authOptions } from "./api/auth/[...nextauth]"
import {
  htmlRegularCharactersRegexString,
  regularCharacterHelperText,
  regularCharacterRegex,
} from "@/lib/util/regex"

function Support() {
  const formRef = useRef<HTMLFormElement>(null)
  const [showEmailSentToast, setShowEmailSentToast] = useState(false)
  const [loading, setLoading] = useState(false)

  function getFormData() {
    if (!formRef.current) throw new Error("Form html element has not yet been initialised")

    const formData = new FormData(formRef.current)

    const from = formData.get("from") as string
    const subject = formData.get("subject") as string
    const body = formData.get("body") as string

    return {
      from,
      subject,
      body,
    }
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()
    // setLoading(true)
    const formData: ContactDataType = getFormData()
    const apiResponse = await postJsonData("/api/support", formData)
    setLoading(false)
    setShowEmailSentToast(true)
  }

  return (
    <section>
      <div className="mx-auto max-w-screen-md px-4 py-8 lg:py-16">
        <h2 className="mb-4 text-center text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Contact Us
        </h2>
        <p className="mb-8 text-center font-light text-gray-500 dark:text-gray-400 sm:text-xl lg:mb-16">
          Got a technical issue? Want to send feedback? Let us know.
        </p>
        <form ref={formRef} onSubmit={onSubmit} className="space-y-8">
          <p>
            <Label className="mb-2 inline-block" htmlFor="from">
              Your email
            </Label>
            <TextInput
              name="from"
              id="from"
              type="email"
              minLength={5}
              placeholder="name@email.com"
              required
            />
          </p>
          <p>
            <Label className="mb-2 inline-block" htmlFor="subject">
              Subject
            </Label>
            <TextInput
              name="subject"
              id="subject"
              pattern={htmlRegularCharactersRegexString}
              minLength={5}
              title={regularCharacterHelperText}
              placeholder="Let us know how we can help you"
            />
          </p>
          <p>
            <Label className="mb-2 inline-block" htmlFor="body">
              Please describe the issue you're having
            </Label>
            <Textarea
              name="body"
              id="body"
              minLength={5}
              rows={6}
              placeholder="How can we help you?..."
              required
            />
          </p>
          <LoadingSubmitButton
            loading={loading}
            className="bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          >
            Send message
          </LoadingSubmitButton>
        </form>
      </div>
      {showEmailSentToast && <EmailSentToast onDismiss={() => setShowEmailSentToast(false)} />}
    </section>
  )
}
export default Support

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<LayoutProps> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect("support")

  const accountList = (await db.query.accounts.findMany({
    columns: { companyName: true, id: true },
    where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
  })) as { companyName: string; id: string }[]

  if (session.accountId === null && accountList.length > 0) {
    await db
      .update(sessions)
      .set({ accountId: accountList[0].id })
      .where(eq(sessions.userId, session.user.id))
    session.accountId = accountList[0].id
  }

  if (accountList.length > 0)
    return {
      props: {
        session,
        companies: accountList,
        selectedAccountId: session.accountId as string,
      } satisfies LayoutProps,
    }
  else
    return {
      props: {
        session,
      } satisfies LayoutProps,
    }
}

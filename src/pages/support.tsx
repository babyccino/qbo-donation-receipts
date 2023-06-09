import { TextArea, TextInput } from "@/components/form"
import { Button, Toast } from "flowbite-react"
import { FormEventHandler, useRef, useState } from "react"

import { DataType as ContactDataType } from "./api/support"
import { postJsonData } from "@/lib/util/request"
import { Svg } from "@/components/ui"

function SentMailToast() {
  return (
    <Toast className="fixed bottom-5 right-5">
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-500 dark:bg-cyan-800 dark:text-cyan-200">
        <div className="h-5 w-5">
          <Svg.Envelope />
        </div>
      </div>
      <div className="ml-3 text-sm font-normal">Your message has been sent.</div>
      <Toast.Toggle />
    </Toast>
  )
}

function Support() {
  const formRef = useRef<HTMLFormElement>(null)
  const [emailSent, setEmailSent] = useState(false)

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
    setEmailSent(true)

    const formData: ContactDataType = getFormData()
    const apiResponse = await postJsonData("/api/support", formData)
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
          <TextInput
            id="from"
            type="email"
            label="Your email"
            placeholder="name@email.com"
            minLength={5}
            required
          />
          <TextInput
            id="subject"
            label="Subject"
            placeholder="Let us know how we can help you"
            minLength={5}
            required
          />
          <TextArea
            id="body"
            label="Leave a comment"
            placeholder="Leave a comment..."
            minLength={5}
            rows={6}
            required
          />
          <Button
            type="submit"
            className="bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
          >
            Send message
          </Button>
        </form>
      </div>
      {emailSent && <SentMailToast />}
    </section>
  )
}
export default Support

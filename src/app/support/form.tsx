"use client"

import { FormEventHandler, ReactNode, useRef, useState } from "react"

import { DataType as ContactDataType } from "@/app/api/support/route"
import { postJsonData } from "@/lib/util/request"
import { EmailSentToast } from "@/components/ui"

export default function Form({ children }: { children: ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [showEmailSentToast, setShowEmailSentToast] = useState(false)

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
    const formData: ContactDataType = getFormData()
    const apiResponse = await postJsonData("/api/support", formData)
    setShowEmailSentToast(true)
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-8">
      {children}
      {showEmailSentToast && <EmailSentToast onDismiss={() => setShowEmailSentToast(false)} />}
    </form>
  )
}

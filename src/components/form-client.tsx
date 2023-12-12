"use client"

import { FileInput, Label } from "flowbite-react"
import { ChangeEventHandler, ReactNode, useState } from "react"

import { isFileSupported } from "@/lib/util/image-helper"

export function ImageInput({
  label,
  id,
  maxSize,
  helper,
  required,
}: {
  label: string
  id: string
  maxSize: number
  helper?: ReactNode
  required?: boolean
}) {
  const [error, setError] = useState(false)

  const handleFileInput: ChangeEventHandler<HTMLInputElement> = event => {
    event.preventDefault()
    const files = event.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    if (file && !isFileSupported(file, maxSize)) {
      event.target.value = ""
      return setError(true)
    }
    return setError(false)
  }

  return (
    <p>
      <Label className="mb-2 inline-block" htmlFor={id}>
        {label}
      </Label>
      <FileInput
        id={id}
        name={id}
        required={required}
        onChange={handleFileInput}
        color={error ? "failure" : undefined}
        helperText={helper}
      />
    </p>
  )
}

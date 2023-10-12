"use client"

import { Checkbox, Label } from "flowbite-react"
import { signIn } from "next-auth/react"
import { FormEventHandler, useState } from "react"

import { SignIn } from "@/components/qbo"

const signInHandler: FormEventHandler<HTMLFormElement> = e => {
  e.preventDefault()
  signIn("QBO-disconnected")
}

export default function Form() {
  const [checked, setChecked] = useState(false)

  return (
    <form
      className="flex w-full max-w-md flex-col items-center rounded-lg bg-white p-6 shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md sm:p-8 md:mt-0"
      onSubmit={signInHandler}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          defaultChecked={false}
          id="agree"
          onChange={e => setChecked(e.currentTarget.checked)}
          className="peer"
          required
        />
        <Label className="flex" htmlFor="agree">
          I agree with the&nbsp;
          <a className="text-primary-600 hover:underline dark:text-primary-500" href="/forms">
            terms and conditions
          </a>
        </Label>
      </div>
      <button type="submit" className="mx-auto mt-4 inline-block disabled:opacity-0">
        <SignIn disabled={!checked} />
      </button>
    </form>
  )
}

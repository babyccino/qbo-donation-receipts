"use client"

// import { signIn } from "next-auth/react"
import { FormEventHandler, ReactNode } from "react"

// const signInHandler: FormEventHandler<HTMLFormElement> = e => {
//   e.preventDefault()
//   signIn("QBO-disconnected")
// }

export default function Form({ children }: { children: ReactNode }) {
  return (
    <form
      className="flex w-full max-w-md flex-col items-center rounded-lg bg-white p-6 shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md sm:p-8 md:mt-0"
      // onSubmit={signInHandler}
    >
      {children}
    </form>
  )
}

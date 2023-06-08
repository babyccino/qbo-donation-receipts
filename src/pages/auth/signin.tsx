import { MouseEventHandler, useState } from "react"
import { signIn } from "next-auth/react"

import { Button, Form } from "@/components/ui"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]"
import Image from "next/image"

export default function SignIn() {
  const [checked, setChecked] = useState(false)

  const handler: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    signIn("QBO")
  }

  return (
    <div className="flex h-full flex-col justify-center gap-8 align-middle">
      <div className="flex justify-center gap-4 align-middle">
        <Image src="/favicon-32x32.png" alt="logo" width={32} height={32} />
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl">
          DonationReceipt.Online
        </h1>
      </div>
      <form className="flex w-full max-w-md flex-col gap-4 space-y-4 rounded-lg bg-white p-6 shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md sm:p-8 md:mt-0 md:space-y-6">
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl">
          Sign in to your account
        </h1>
        <div className="flex items-center gap-2">
          <Form.Checkbox id="agree" onChange={e => setChecked(e.currentTarget.checked)} />
          <Form.Label className="flex" htmlFor="agree">
            I agree with the&nbsp;
            <a className="text-primary-600 hover:underline dark:text-primary-500" href="/forms">
              terms and conditions
            </a>
          </Form.Label>
        </div>
        <Button type="submit" onClick={handler} disabled={!checked}>
          Sign-in with Quickbooks Online
        </Button>
      </form>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<{}> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  if (session)
    return {
      redirect: { destination: "/" },
      props: {},
    }

  return { props: {} }
}

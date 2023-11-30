import { Checkbox, Label } from "flowbite-react"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { useState } from "react"

import { SignIn } from "@/components/qbo"
import { useSearchParams } from "next/navigation"

export default function SignInPage() {
  const [checked, setChecked] = useState(false)
  const searchParams = useSearchParams()
  const callback = searchParams.get("callback")

  return (
    <div className="flex h-full flex-grow flex-col justify-center gap-8 align-middle">
      <div className="flex justify-center gap-4 align-middle">
        <Image src="/android-chrome-192x192.png" alt="logo" width={32} height={32} />
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl">
          DonationReceipt.Online
        </h1>
      </div>
      <form className="flex w-full max-w-md flex-col items-center rounded-lg bg-white p-6 shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md sm:p-8 md:mt-0">
        <div className="flex items-center gap-2">
          <Checkbox
            defaultChecked={false}
            id="agree"
            onChange={e => setChecked(e.currentTarget.checked)}
          />
          <Label className="flex" htmlFor="agree">
            I agree with the&nbsp;
            <a className="text-primary-600 hover:underline dark:text-primary-500" href="/forms">
              terms and conditions
            </a>
          </Label>
        </div>
        <button
          className="mx-auto mt-4 inline-block"
          onClick={e => {
            e.preventDefault()
            signIn("QBO-disconnected", { callbackUrl: "/" + callback ?? "" })
          }}
        >
          <SignIn disabled={!checked} />
        </button>
      </form>
    </div>
  )
}

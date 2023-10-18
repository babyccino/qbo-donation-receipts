import Image from "next/image"
import { Checkbox } from "flowbite-react/lib/esm/components/Checkbox"
import { Label } from "flowbite-react/lib/esm/components/Label"
import Link from "next/link"

import QBOSignInDefault from "@/public/svg/qbo/qbo-sign-in-default.svg"

export default function SignInPage() {
  return (
    <div className="flex h-full flex-grow flex-col justify-center gap-8 align-middle">
      <div className="flex justify-center gap-4 align-middle">
        <Image src="/android-chrome-192x192.png" alt="logo" width={32} height={32} />
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl">
          DonationReceipt.Online
        </h1>
      </div>
      <form className="w-full max-w-md flex-col items-center rounded-lg bg-white p-6 shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md sm:p-8 md:mt-0">
        <Checkbox defaultChecked={false} id="agree" className="peer inline-block" required />
        <Label className="ml-3 inline-block" htmlFor="agree">
          I agree with the{" "}
          <a className="text-primary-600 hover:underline dark:text-primary-500" href="/forms">
            terms and conditions
          </a>
        </Label>
        <div className="brightness-50 filter peer-checked:filter-none peer-checked:hover:brightness-90 flex justify-center">
          <Link className="mx-auto mt-4 block" href="/api/auth/disconnect-sign-in">
            <QBOSignInDefault />
          </Link>
        </div>
      </form>
    </div>
  )
}

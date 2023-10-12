import Image from "next/image"

import Form from "./form"

export default function SignInPage() {
  return (
    <div className="flex h-full flex-grow flex-col justify-center gap-8 align-middle">
      <div className="flex justify-center gap-4 align-middle">
        <Image src="/android-chrome-192x192.png" alt="logo" width={32} height={32} />
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl">
          DonationReceipt.Online
        </h1>
      </div>
      <Form />
    </div>
  )
}

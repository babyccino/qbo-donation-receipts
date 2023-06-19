import Image from "next/image"

const Info = () => (
  <section className="flex min-h-screen flex-col p-4 sm:flex-row sm:justify-center">
    <div className="mx-auto max-w-screen-xl items-center gap-16 px-4 py-8 lg:grid lg:grid-cols-2 lg:px-6 lg:py-16">
      <div className="font-light text-gray-500 dark:text-gray-400 sm:text-lg">
        <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Speed up your organisation{"'"}s year-end
        </h2>
        <p className="mb-4">
          With DonationReceipt.Online, managing your donation receipts has never been easier.
          Download and preview your receipts, and soon you{"'"}ll even be able to automatically send
          them to your donors. Seamlessly integrate with QuickBooks Online by signing in to
          DonationReceipt.Online using your QuickBooks account. By utilizing your QuickBooks Online
          data, we simplify the process of creating personalized donation receipts for your donors.
          Simplify your receipt management and enhance your donor relationships with
          DonationReceipt.Online.
        </p>
      </div>
      <div className="relative mt-8 grid grid-cols-2 gap-4">
        <Image
          className="w-full rounded-lg"
          src="/using-calc.jpg"
          alt="person recording donations"
          width={100}
          height={100}
        />
        <Image
          className="mt-4 w-full rounded-lg lg:mt-10"
          src="/volunteering.jpg"
          alt="people volunteering"
          width={100}
          height={100}
        />
      </div>
    </div>
  </section>
)
export default Info

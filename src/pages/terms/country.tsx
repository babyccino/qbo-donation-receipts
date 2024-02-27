const Country = () => (
  <section className="flex min-h-screen flex-col p-4 sm:justify-center">
    <div className="mx-auto max-w-screen-sm px-4 py-8 text-center lg:px-6 lg:py-16">
      <p className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white">
        DonationReceipt.Online is not available for your organisation.
      </p>
      <p className="mb-8 text-lg font-light text-gray-500 dark:text-gray-400">
        DonationReceipt.Online is only available for companies based in Canada.
      </p>
    </div>
  </section>
)
export default Country

// --- server-side props ---

export { defaultGetServerSideProps as getServerSideProps } from "@/lib/util/nextjs-helper"

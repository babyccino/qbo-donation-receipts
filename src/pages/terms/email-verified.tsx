import { Link } from "@/components/link"

const EmailVerified = () => (
  <section className="flex min-h-screen flex-col p-4 sm:justify-center">
    <div className="mx-auto max-w-screen-sm px-4 py-8 text-center lg:px-6 lg:py-16">
      <p className="mb-4 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl dark:text-white">
        Your email is not verified.
      </p>
      <p className="mb-8 text-lg font-light text-gray-500 dark:text-gray-400">
        To use third party QuickBooks Online applications your email must be verified. Click the
        link below to get verified
      </p>
      <Link href="https://accounts.intuit.com/app/account-manager/security">Verify your email</Link>
    </div>
  </section>
)
export default EmailVerified

// --- server-side props ---

export { defaultGetServerSideProps as getServerSideProps } from "@/lib/util/nextjs-helper"

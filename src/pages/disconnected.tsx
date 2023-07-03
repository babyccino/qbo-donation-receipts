import { Link } from "@/components/ui"

const Disconnected = () => (
  <section className="flex min-h-screen flex-col p-4 sm:justify-center">
    <div className="mx-auto max-w-screen-sm px-4 py-8 text-center lg:px-6 lg:py-16">
      <p className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
        QuickBooks Online disconnected.
      </p>
      <p className="mb-8 text-lg font-light text-gray-500 dark:text-gray-400">
        Your QuickBooks integration has been disconnected. If you{"'"}d like to re-connect sign in
        here:
      </p>
      <Link href="/auth/signin">Reconnect</Link>
    </div>
  </section>
)
export default Disconnected

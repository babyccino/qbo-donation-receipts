import { Link } from "@/components/link"

export default function Sent() {
  return (
    <section className="flex min-h-full flex-col justify-center">
      <div className="mx-auto max-w-screen-sm px-4 py-8 text-center lg:px-6 lg:py-16">
        <h1 className="mb-4 text-7xl font-extrabold tracking-tight text-primary-600 dark:text-primary-500 lg:text-9xl">
          ✉️
        </h1>
        <p className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
          Your email has been sent.
        </p>
        <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
          We{"'"}ll be in touch shortly.
        </p>
        <Link
          href="/"
          className="my-4 inline-flex rounded-lg bg-primary-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-900"
        >
          Back to Homepage
        </Link>
      </div>
    </section>
  )
}

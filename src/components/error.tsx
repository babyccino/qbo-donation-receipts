import Head from "next/head"
import { ReactNode } from "react"
import { ErrorBoundary as _ErrorBoundary, FallbackProps } from "react-error-boundary"

import { Link } from "@/components/ui"
import { Show } from "@/lib/util/react"

export const Fallback = ({ error }: FallbackProps) => (
  <>
    <Head>
      <title>An unexpected error has occured</title>
    </Head>
    <section className="flex min-h-full flex-col justify-center">
      <div className="mx-auto max-w-screen-sm px-4 py-8 text-center lg:px-6 lg:py-16">
        <p className="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
          An unexpected error has occured
        </p>
        <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
          If this error persists, please contact an administrator.
        </p>
        <Show when={error.message}>
          <p className="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
            Error: {error.message}
          </p>
        </Show>
        <Link href="/support">Contact support</Link>
      </div>
    </section>
  </>
)

const ErrorBoundary = ({ children }: { children?: ReactNode }) => (
  <_ErrorBoundary FallbackComponent={Fallback}>{children}</_ErrorBoundary>
)

export default ErrorBoundary

import Link from "next/link"
import { ReactNode } from "react"
import { GetServerSideProps } from "next"
import { getServerSession, Session } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"
import { Svg } from "@/components/ui"
import { multipleClasses } from "@/lib/util"

const Card = ({
  title,
  body,
  href,
  className,
}: {
  title: string
  body?: string
  href: string
  className?: string
}) => (
  <Link
    href={href}
    className={multipleClasses(
      "max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700",
      className
    )}
  >
    <h6 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h6>
    {body && <p className="font-normal text-gray-700 dark:text-gray-400">{body}</p>}
  </Link>
)

type Props = { session: Session | null }

export default function IndexPage() {
  return (
    <section className="py-8 px-4 space-y-12 mx-auto max-w-screen-xl text-center lg:py-16">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
          Speed up your organisation{"'"}s year-end
        </h1>
        <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
          In just a few easy steps we can create and send your client{"'"}s donation receipts
        </p>
      </div>
      <div className="flex flex-col items-center w-full">
        <Card
          href="/services"
          title="Select your qualifying items"
          body="Select which of your quickbooks sales constitute a gift"
        />
        <div className="h-10 w-10 text-white rotate-180 mt-3">
          <Svg.HandDrawnUpArrow />
        </div>
        <Card
          href="/details"
          className="mt-4"
          title="Enter your organisation's details"
          body="Enter necessary information such as registration number, signature, company logo, etc."
        />
        <div className="h-10 w-10 text-white rotate-180 mt-3">
          <Svg.HandDrawnUpArrow />
        </div>
        <Card
          href="/generate-receipts"
          className="mt-4"
          title="Generate your clients' receipts"
          body="Receipts can be downloaded individually or all together. We can also automatically email receipts to all qualifying donors"
        />
      </div>
    </section>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session = await getServerSession(context.req, context.res, authOptions)

  return {
    props: {
      session,
    },
  }
}

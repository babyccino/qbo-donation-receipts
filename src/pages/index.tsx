import Link from "next/link"
import { ReactNode } from "react"
import { GetServerSideProps } from "next"
import { getServerSession, Session } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"
import { buttonStyling, Svg } from "@/components/ui"
import { multipleClasses } from "@/lib/util/etc"
import { user } from "@/lib/db"
import { alreadyFilledIn } from "@/lib/app-api"

const Card = ({
  title,
  body,
  href,
  className,
  completed,
  children,
}: {
  title: string
  body?: string
  href: string
  className?: string
  completed?: boolean
  children?: ReactNode
}) => (
  <Link
    href={href}
    className={multipleClasses(
      "relative max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700",
      className
    )}
  >
    <h6 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h6>
    {body && <p className="font-normal text-gray-700 dark:text-gray-400">{body}</p>}
    {completed && (
      <div className="absolute top-4 right-2 w-8 h-8 text-green-400">
        <Svg.Tick />
      </div>
    )}
    {children}
  </Link>
)

type Props =
  | { session: null; filledIn: false }
  | { session: Session; filledIn: { items: boolean; doneeDetails: boolean } }

const IndexPage = ({ filledIn }: Props) => (
  <section className="sm:py-8 px-4 space-y-12 mx-auto max-w-screen-xl text-center lg:py-16 p-4">
    <div>
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-4xl dark:text-white">
        Speed up your organisation{"'"}s year-end
      </h1>
      <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 lg:px-48 dark:text-gray-400">
        In just a few easy steps we can create and send your client{"'"}s donation receipts
      </p>
      {(!filledIn || (!filledIn.items && !filledIn.doneeDetails)) && (
        <Link href="/services" className={"text-lg py-3 px-5 " + buttonStyling}>
          Get started
          <div className="ml-2 -mb-1 w-5 h-5 inline-block">
            <Svg.RightArrow />
          </div>
        </Link>
      )}
    </div>
    <div className="flex flex-col items-center w-full">
      <Card
        href="/api/auth/signin"
        title="Link your account"
        body="Sign in with your Quickbooks Online account and authorise our application"
        completed={filledIn !== false}
      />
      <div className="h-10 w-10 text-slate-400 rotate-180 mt-3">
        <Svg.HandDrawnUpArrow />
      </div>
      <Card
        href="/services"
        title="Select your qualifying items"
        body="Select which of your quickbooks sales constitute a gift"
        completed={filledIn && filledIn.items}
      />
      <div className="h-10 w-10 text-slate-400 rotate-180 mt-3">
        <Svg.HandDrawnUpArrow />
      </div>
      <Card
        href="/details"
        className="mt-4"
        title="Enter your organisation's details"
        body="Enter necessary information such as registration number, signature, company logo, etc."
        completed={filledIn && filledIn.doneeDetails}
      />
      <div className="h-10 w-10 text-slate-400 rotate-180 mt-3">
        <Svg.HandDrawnUpArrow />
      </div>
      <Card
        href="/generate-receipts"
        className="mt-4"
        title="Generate your clients' receipts"
        body="Receipts can be downloaded individually or all together. We can also automatically email receipts to all qualifying donors"
        completed={filledIn && filledIn.doneeDetails && filledIn.items}
      >
        {filledIn && filledIn.doneeDetails && filledIn.items && (
          <p className="font-bold mt-4 text-green-400">We{"'"}re ready to create your receipts!</p>
        )}
      </Card>
    </div>
  </section>
)
export default IndexPage

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)

  if (!session)
    return {
      props: {
        session,
        filledIn: false,
      },
    }

  const doc = await user.doc(session.user.id).get()

  const filledIn = alreadyFilledIn(doc)

  return {
    props: {
      session,
      filledIn,
    },
  }
}

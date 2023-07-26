import { ReactNode } from "react"
import { GetServerSideProps } from "next"
import { getServerSession, Session } from "next-auth"
import { twMerge } from "tailwind-merge"
import Link from "next/link"

import { authOptions } from "./api/auth/[...nextauth]"
import { Svg, Link as StyledLink } from "@/components/ui"
import { checkUserDataCompletion } from "@/lib/db-helper"
import { getUserData } from "@/lib/db"

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
    className={twMerge(
      "relative max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700",
      className
    )}
  >
    <h6 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h6>
    {body && <p className="font-normal text-gray-700 dark:text-gray-400">{body}</p>}
    {completed && (
      <div className="absolute right-2 top-4 h-8 w-8 text-green-400">
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
  <section className="mx-auto max-w-screen-xl space-y-12 p-4 px-4 text-center sm:py-8 lg:py-16">
    <div>
      <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-3xl lg:text-4xl">
        Speed up your organisation{"'"}s year-end
      </h1>
      <p className="mb-8 text-lg font-normal text-gray-500 dark:text-gray-400 sm:px-16 lg:px-48 lg:text-xl">
        In just a few easy steps we can create and send your client{"'"}s donation receipts
      </p>
      {(!filledIn || (!filledIn.items && !filledIn.doneeDetails)) && (
        <StyledLink href="/items" className="px-5 py-3 text-lg">
          Get started
          <div className="-mb-1 ml-2 inline-block h-5 w-5">
            <Svg.RightArrow />
          </div>
        </StyledLink>
      )}
    </div>
    <div className="flex w-full flex-col items-center">
      <Card
        href="/api/auth/signin"
        title="Link your account"
        body="Sign in with your QuickBooks Online account and authorise our application"
        completed={filledIn !== false}
      />
      <div className="mt-3 h-10 w-10 rotate-180 text-slate-400">
        <Svg.HandDrawnUpArrow />
      </div>
      <Card
        href="/items"
        className="mt-4"
        title="Select your qualifying items"
        body="Select which of your QuickBooks sales constitute a gift"
        completed={filledIn && filledIn.items}
      />
      <div className="mt-3 h-10 w-10 rotate-180 text-slate-400">
        <Svg.HandDrawnUpArrow />
      </div>
      <Card
        href="/details"
        className="mt-4"
        title="Enter your organisation's details"
        body="Enter necessary information such as registration number, signature, company logo, etc."
        completed={filledIn && filledIn.doneeDetails}
      />
      <div className="mt-3 h-10 w-10 rotate-180 text-slate-400">
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
          <p className="mt-4 font-bold text-green-400">We{"'"}re ready to create your receipts!</p>
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

  const user = await getUserData(session.user.id)
  const filledIn = checkUserDataCompletion(user)

  return {
    props: {
      session,
      filledIn,
    },
  }
}

import { ArrowRightIcon, CheckIcon } from "@heroicons/react/24/solid"
import { and, eq, or } from "drizzle-orm"
import { GetServerSideProps } from "next"
import { Session, getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import Link from "next/link"
import { ReactNode } from "react"
import { twMerge } from "tailwind-merge"

import { Link as StyledLink } from "@/components/link"
import { db } from "@/lib/db/test"
import { Show } from "@/lib/util/react"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { QboPermission } from "@/types/next-auth-helper"
import { accounts, doneeInfos, userDatas, users } from "db/schema"

import HandDrawnUpArrow from "@/public/svg/hand-drawn-up-arrow.svg"

const _Card = ({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children?: ReactNode
}) => (
  <Link
    href={href}
    className={twMerge(
      "relative max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700",
      className,
    )}
  >
    {children}
  </Link>
)
const Body = ({ children }: { children?: ReactNode }) => (
  <p className="font-normal text-gray-700 dark:text-gray-400">{children}</p>
)
const Title = ({ children }: { children?: ReactNode }) => (
  <h6 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
    {children}
  </h6>
)
const Tick = () => <CheckIcon className="absolute right-2 top-4 h-8 w-8 text-green-400" />
const Note = ({ children }: { children?: ReactNode }) => (
  <p className="mt-4 font-bold text-green-400">{children}</p>
)
const Card = Object.assign(_Card, { Body, Title, Tick, Note })
const Arrow = () => <HandDrawnUpArrow className="mt-3 h-10 w-10 rotate-180 text-slate-400" />

type Props =
  | { session: null; filledIn: false }
  | {
      session: Session
      filledIn: { items: boolean; doneeDetails: boolean }
      qboPermission: QboPermission
    }

export default function IndexPage(props: Props) {
  const { filledIn } = props
  return (
    <section className="mx-auto max-w-screen-xl space-y-12 p-4 px-4 text-center sm:py-8 lg:py-16">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-3xl lg:text-4xl">
          Speed up your organisation{"'"}s year-end
        </h1>
        <p className="mb-8 text-lg font-normal text-gray-500 dark:text-gray-400 sm:px-16 lg:px-48 lg:text-xl">
          In just a few easy steps we can create and send your client{"'"}s donation receipts
        </p>
        <Show when={!filledIn || (!filledIn.items && !filledIn.doneeDetails)}>
          <StyledLink href="/items" className="px-5 py-3 text-lg">
            Get started
            <ArrowRightIcon className="-mt-1 ml-2 inline-block h-5 w-5" />
          </StyledLink>
        </Show>
      </div>
      <div className="flex w-full flex-col items-center">
        <Card href={filledIn ? "/account" : "/api/auth/signin"}>
          <Card.Title>Link your account</Card.Title>
          <Card.Body>
            Sign in with your QuickBooks Online account and authorise our application
          </Card.Body>
          {filledIn && props?.qboPermission === QboPermission.Accounting && <Card.Tick />}
        </Card>
        <Arrow />
        <Card href="/items" className="mt-4">
          <Card.Title>Select your qualifying items</Card.Title>
          <Card.Body>Select which of your QuickBooks sales items constitute a gift</Card.Body>
          {filledIn && filledIn.items && <Card.Tick />}
        </Card>
        <Arrow />
        <Card href="/details" className="mt-4">
          <Card.Title>Enter your organisation{"'"}s details</Card.Title>
          <Card.Body>
            Enter necessary information such as registration number, signature, company logo, etc.
          </Card.Body>
          {filledIn && filledIn.doneeDetails && <Card.Tick />}
        </Card>
        <Arrow />
        <Card href="/generate-receipts" className="mt-4">
          <Card.Title>Generate your clients{"'"} receipts</Card.Title>
          <Card.Body>Receipts can be downloaded individually or all together</Card.Body>
          <Show when={filledIn && filledIn.doneeDetails && filledIn.items}>
            <Card.Tick />
            <Card.Note>We{"'"}re ready to create your receipts!</Card.Note>
          </Show>
        </Card>
        <Arrow />
        <Card href="/email" className="mt-4">
          <Card.Title>Send your donors their receipts</Card.Title>
          <Card.Body>Automatically email receipts to all qualifying donors</Card.Body>
          <Show when={filledIn && filledIn.doneeDetails && filledIn.items}>
            <Card.Tick />
            <Card.Note>We{"'"}re ready to send your receipts!</Card.Note>
          </Show>
        </Card>
      </div>
    </section>
  )
}

// --- server-side props ---

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res, query }) => {
  const session = await getServerSession(req, res, authOptions)
  console.log(session)

  if (session === null) {
    return {
      props: {
        session: null,
        filledIn: false,
      },
    }
  }

  const queryRealmId = typeof query.realmid === "string" ? query.realmid : undefined

  const eqUserId = eq(users.id, session.user.id)
  const account = await db.query.accounts.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: queryRealmId ? and(eq(accounts.realmId, queryRealmId), eqUserId) : eqUserId,
    columns: { scope: true },
    with: { userData: { columns: { id: true } }, doneeInfo: { columns: { id: true } } },
  })
  if (!account)
    throw new ApiError(500, "account for given user and company realmId not found in db")

  // const user = await getUserDataOrThrow(session.user.id)
  const filledIn = { items: Boolean(account.userData), doneeDetails: Boolean(account.doneeInfo) }
  const qboPermission =
    account.scope === "accounting" ? QboPermission.Accounting : QboPermission.Profile

  return {
    props: {
      session,
      filledIn,
      qboPermission,
    },
  }
}

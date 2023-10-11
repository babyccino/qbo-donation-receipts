import { ArrowRightIcon } from "@heroicons/react/24/solid"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/auth"
import { Link as StyledLink } from "@/components/link"
import { checkUserDataCompletion } from "@/lib/db-helper"
import { Show } from "@/lib/util/react"
import { QboPermission } from "@/types/next-auth-helper"
import { Body, Card, Note, Tick, Title } from "@/components/card"
import { FromUserData } from "@/components/db"
import HandDrawnUpArrow from "@/public/svg/hand-drawn-up-arrow.svg"

const Arrow = () => <HandDrawnUpArrow className="mt-3 h-10 w-10 rotate-180 text-slate-400" />

type cbType = (arg: { items: boolean; doneeDetails: boolean }) => JSX.Element | null | false
async function FromFilledIn({ id, children }: { id: string; children: cbType }) {
  return <FromUserData id={id}>{user => children(checkUserDataCompletion(user))}</FromUserData>
}

export default async function IndexPage() {
  const session = await getServerSession(authOptions)

  return (
    <section className="mx-auto max-w-screen-xl space-y-12 p-4 px-4 text-center sm:py-8 lg:py-16">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white md:text-3xl lg:text-4xl">
          Speed up your organisation{"'"}s year-end
        </h1>
        <p className="mb-8 text-lg font-normal text-gray-500 dark:text-gray-400 sm:px-16 lg:px-48 lg:text-xl">
          In just a few easy steps we can create and send your client{"'"}s donation receipts
        </p>
        {session && (
          <FromFilledIn id={session.user.id}>
            {({ items, doneeDetails }) =>
              !items &&
              !doneeDetails && (
                <StyledLink href="/items" className="px-5 py-3 text-lg">
                  Get started
                  <ArrowRightIcon className="-mt-1 ml-2 inline-block h-5 w-5" />
                </StyledLink>
              )
            }
          </FromFilledIn>
        )}
      </div>
      <div className="flex w-full flex-col items-center">
        <Card href={session ? "/account" : "/api/auth/signin"}>
          <Title>Link your account</Title>
          <Body>Sign in with your QuickBooks Online account and authorise our application</Body>
          {session?.qboPermission === QboPermission.Accounting && <Tick />}
        </Card>
        <Arrow />
        <Card href="/items" className="mt-4">
          <Title>Select your qualifying items</Title>
          <Body>Select which of your QuickBooks sales items constitute a gift</Body>
          {session && (
            <FromFilledIn id={session.user.id}>
              {({ items, doneeDetails }) => items && <Tick />}
            </FromFilledIn>
          )}
        </Card>
        <Arrow />
        <Card href="/details" className="mt-4">
          <Title>Enter your organisation{"'"}s details</Title>
          <Body>
            Enter necessary information such as registration number, signature, company logo, etc.
          </Body>
          {session && (
            <FromFilledIn id={session.user.id}>
              {({ items, doneeDetails }) => doneeDetails && <Tick />}
            </FromFilledIn>
          )}
        </Card>
        <Arrow />
        <Card href="/generate-receipts" className="mt-4">
          <Title>Generate your clients{"'"} receipts</Title>
          <Body>Receipts can be downloaded individually or all together</Body>
          {session && (
            <FromFilledIn id={session.user.id}>
              {({ items, doneeDetails }) => (
                <Show when={doneeDetails && items}>
                  <Tick />
                  <Note>We{"'"}re ready to create your receipts!</Note>
                </Show>
              )}
            </FromFilledIn>
          )}
        </Card>
        <Arrow />
        <Card href="/email" className="mt-4">
          <Title>Send your donors their receipts</Title>
          <Body>Automatically email receipts to all qualifying donors</Body>
          {session && (
            <FromFilledIn id={session.user.id}>
              {({ items, doneeDetails }) => (
                <Show when={doneeDetails && items}>
                  <Tick />
                  <Note>We{"'"}re ready to send your receipts!</Note>
                </Show>
              )}
            </FromFilledIn>
          )}
        </Card>
      </div>
    </section>
  )
}

/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import "./globals.css"

import {
  ArrowRightOnRectangleIcon,
  Bars3BottomLeftIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  PlusSmallIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  UserCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid"
import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ReactNode } from "react"

import { SignIn, SignOut } from "@/components/nav"
import { db } from "@/lib/db"
import { accounts, sessions } from "db/schema"
import { getServerSession } from "@/app/auth-util"
import { and, desc, eq, isNotNull } from "drizzle-orm"
import { ApiError } from "next/dist/server/api-utils"
import { NavLink } from "@/components/nav-server"

export const metadata = {
  title: "DonationReceipt.Online",
  description: "Expedite your organisation's year-end!",
}

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getServerSession()
  const user = session?.user
  const companies =
    session && session?.accountId !== null
      ? ((await db.query.accounts.findMany({
          columns: { companyName: true, id: true },
          where: and(isNotNull(accounts.companyName), eq(accounts.userId, session.user.id)),
          orderBy: desc(accounts.updatedAt),
        })) as { companyName: string; id: string }[])
      : undefined
  const otherCompanies = companies
    ? companies.filter(company => company.id !== session!.accountId)
    : undefined

  return (
    <html>
      <body className="relative flex flex-col dark:bg-gray-900 sm:flex-row">
        <header>
          <button
            aria-controls="separator-sidebar"
            type="button"
            className="group peer ml-3 mt-2 inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 sm:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3BottomLeftIcon className="h-6 w-6" />
            <nav
              className="fixed left-0 top-0 z-30 h-screen w-64 -translate-x-full bg-gray-50 transition-transform group-focus-within:transform-none dark:bg-gray-800 sm:!translate-x-0"
              aria-label="Sidebar"
            />
          </button>
          <div className="fixed inset-0 -z-10 bg-black opacity-0 transition peer-focus-within:z-20 peer-focus-within:opacity-40" />
          <nav
            className="fixed left-0 top-0 z-40 h-full w-64 -translate-x-full bg-gray-50 transition-transform peer-focus-within:transform-none dark:bg-gray-800 sm:!translate-x-0 px-3 py-4 "
            aria-label="Sidebar"
          >
            {companies && (
              <>
                <Companies
                  companyName={
                    companies.find(company => company.id === (session?.accountId as string))
                      ?.companyName ?? ""
                  }
                  otherCompanies={otherCompanies}
                />
                <hr
                  style={{ margin: "1rem 0" }}
                  className="border-t border-gray-200 dark:border-gray-700"
                />
              </>
            )}
            <ul className="h-full space-y-2 font-medium">
              {user && (
                <>
                  <NavLink link="/" logo={<RectangleGroupIcon />} label="Dashboard" />
                  <NavLink link="/items" logo={<ShoppingBagIcon />} label="Items" />
                  <NavLink link="/details" logo={<RectangleStackIcon />} label="Details" />
                  <NavLink link="/generate-receipts" logo={<TableCellsIcon />} label="Receipts" />
                  <NavLink link="/email" logo={<EnvelopeIcon />} label="Email" />
                  <NavLink link="/account" logo={<UserCircleIcon />} label="Account" />
                  <hr
                    style={{ margin: "1rem 0" }}
                    className="border-t border-gray-200 dark:border-gray-700"
                  />
                </>
              )}

              {user ? <SignOut /> : <SignIn />}
              {user && (
                <NavLink
                  link="/api/stripe/create-checkout-session"
                  logo={<UserPlusIcon />}
                  label="Upgrade To Pro"
                />
              )}

              <hr
                style={{ margin: "1rem 0" }}
                className="border-t border-gray-200 dark:border-gray-700"
              />

              <NavLink link="/info" logo={<InformationCircleIcon />} label="Info" />
              <NavLink link="/terms/terms" logo={<GlobeAltIcon />} label="Terms and Conditions" />
              <NavLink link="/terms/privacy" logo={<DocumentTextIcon />} label="Privacy Policy" />
              {user && (
                <NavLink link="/support" logo={<ChatBubbleLeftEllipsisIcon />} label="Support" />
              )}
            </ul>
          </nav>
          <div className="hidden w-64 sm:block" />
        </header>

        <main className="flex min-h-screen flex-1 flex-col items-center">{children}</main>
      </body>
    </html>
  )
}

const Companies = ({
  companyName,
  otherCompanies,
}: {
  companyName: string
  otherCompanies?: { companyName: string; id: string }[]
}) => (
  <button
    type="button"
    className="flex flex-col items-center w-full text-base text-gray-900 group/companies"
    aria-controls="dropdown-example"
  >
    <div className="flex flex-nowrap relative overflow-hidden items-center justify-between w-full flex-1 text-left rtl:text-right hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 p-2 transition duration-75 rounded-lg group/activecompany">
      <div className="flex flex-row items-center whitespace-nowrap flex-shrink">
        <div className="h-6 w-6 text-gray-500 transition duration-75 group-hover/activecompany:text-gray-900 dark:text-gray-400 dark:group-hover/activecompany:text-white">
          <BuildingOfficeIcon />
        </div>
        <span className="ml-3 flex-1 whitespace-nowrap">{companyName}</span>
      </div>
      <div className="absolute right-0 inline-block pl-1 text-gray-500 transition duration-75 dark:text-white bg-gray-50 dark:bg-gray-800 group-hover/activecompany:bg-gray-100 dark:group-hover/activecompany:bg-gray-700">
        <ChevronDownIcon className=" w-5 h-5" stroke="currentColor" strokeWidth={2} />
      </div>
    </div>
    <ul
      id="dropdown-example"
      className="hidden group-focus-within/companies:block py-2 space-y-2 w-full"
    >
      {otherCompanies?.map(({ companyName, id: accountId }) => (
        <li key={accountId}>
          <button
            formAction={async () => {
              "use server"

              const session = await getServerSession()
              if (!session) throw new ApiError(401, "user not signed in")
              const account = await db.query.accounts.findFirst({
                columns: { id: true },
                where: eq(accounts.id, accountId),
              })
              if (!account)
                throw new ApiError(400, "account with selected company id does not exist")
              await db
                .update(sessions)
                .set({ accountId })
                .where(eq(sessions.userId, session.user.id))
              return revalidatePath("/")
            }}
            className="flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg pl-11 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
          >
            {companyName}
          </button>
        </li>
      ))}
      <li>
        <Link
          className="flex items-center w-full rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 group"
          href="/api/auth/connect"
        >
          <div className="h-6 w-6 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">
            <PlusSmallIcon />
          </div>
          <span className="ml-3 flex-1 whitespace-nowrap text-left">Add Account</span>
        </Link>
      </li>
    </ul>
  </button>
)

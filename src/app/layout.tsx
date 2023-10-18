/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import "./globals.scss"

import {
  ArrowRightOnRectangleIcon,
  Bars3BottomLeftIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  RectangleGroupIcon,
  RectangleStackIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  UserCircleIcon,
} from "@heroicons/react/24/solid"
import Link from "next/link"
import { ReactNode } from "react"

import { FromUserData } from "@/components/db"
import { NavInnerProps, NavItemInner, SignOut, Upgrade } from "@/components/nav"
import { isUserSubscribed } from "@/lib/stripe"
import { getServerSession } from "./auth-util"

export const metadata = {
  title: "DonationReceipt.Online",
  description: "Expedite your organisation's year-end!",
}

const NavLink = ({
  link,
  ...props
}: {
  link: string
} & NavInnerProps) => (
  <li>
    <Link
      href={link}
      className="flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
    >
      <NavItemInner {...props} />
    </Link>
  </li>
)

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getServerSession()
  const user = session?.user
  const isSubscribed = true

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
            className="fixed left-0 top-0 z-40 h-full w-64 -translate-x-full bg-gray-50 transition-transform peer-focus-within:transform-none dark:bg-gray-800 sm:!translate-x-0"
            aria-label="Sidebar"
          >
            <ul className="h-full space-y-2 overflow-y-auto px-3 py-4 font-medium">
              <NavLink link="/" logo={<RectangleGroupIcon />} label="Dashboard" />
              <NavLink link="/items" logo={<ShoppingBagIcon />} label="Items" />
              <NavLink link="/details" logo={<RectangleStackIcon />} label="Details" />
              <NavLink link="/generate-receipts" logo={<TableCellsIcon />} label="Receipts" />
              <NavLink link="/email" logo={<EnvelopeIcon />} label="Email" />
              {user && <NavLink link="/account" logo={<UserCircleIcon />} label="Account" />}
              {user ? (
                <SignOut />
              ) : (
                <NavLink link="/auth/signin" logo={<ArrowRightOnRectangleIcon />} label="Sign In" />
              )}

              <hr
                style={{ margin: "1rem 0" }}
                className="border-t border-gray-200 dark:border-gray-700"
              />

              {user && (
                <FromUserData id={user.id}>
                  {userData => !isUserSubscribed(userData) && <Upgrade />}
                </FromUserData>
              )}
              <NavLink link="/terms/terms" logo={<GlobeAltIcon />} label="Terms and Conditions" />
              <NavLink link="/terms/privacy" logo={<DocumentTextIcon />} label="Privacy Policy" />
              <NavLink link="/support" logo={<ChatBubbleLeftEllipsisIcon />} label="Support" />
            </ul>
          </nav>
          <div className="hidden w-64 sm:block" />
        </header>

        <main className="flex min-h-screen flex-1 flex-col items-center">{children}</main>
      </body>
    </html>
  )
}

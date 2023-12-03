import {
  ArrowLeftOnRectangleIcon,
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
  UserPlusIcon,
} from "@heroicons/react/24/solid"
import { Dropdown } from "flowbite-react"
import { Session } from "next-auth"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/router"
import { MouseEventHandler, ReactNode, useEffect, useState } from "react"

import { Show } from "@/lib/util/react"
import { subscribe } from "@/lib/util/request"

export type LayoutProps = {
  session?: Session
} & (
  | { companies: { companyName: string; id: string }[]; selectedAccountId: string }
  | { companies?: undefined | null; selectedAccountId?: undefined | null }
)

export default function Layout(
  props: {
    children: ReactNode
  } & LayoutProps,
) {
  const router = useRouter()
  const { children, session } = props
  const user = session?.user
  const [showSidebar, setShowSidebar] = useState(false)

  const companies = props.companies?.length ? props.companies : undefined

  useEffect(() => {
    const cb = () => setShowSidebar(false)
    router.events.on("routeChangeStart", cb)
    return () => router.events.off("routeChangeStart", cb)
  }, [router.events])

  return (
    <div className="relative flex flex-col sm:flex-row">
      <header>
        <button
          aria-controls="separator-sidebar"
          type="button"
          className="ml-3 mt-2 inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 sm:hidden"
          onClick={() => setShowSidebar(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3BottomLeftIcon className="h-6 w-6" />
        </button>
        <Show when={showSidebar}>
          <div
            className="fixed inset-0 z-20 animate-fadeIn bg-black/40"
            onClick={() => setShowSidebar(false)}
          />
        </Show>
        <nav
          id="separator-sidebar"
          className={
            "fixed left-0 top-0 z-40 h-screen w-64 transition-transform sm:translate-x-0 flex flex-col justify-between bg-gray-50 dark:bg-gray-800" +
            (showSidebar ? "" : " -translate-x-full")
          }
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
              <NavAnchor
                href="/api/auth/signout"
                logo={<ArrowLeftOnRectangleIcon />}
                onClick={e => {
                  e.preventDefault()
                  signOut()
                }}
                label="Sign Out"
              />
            ) : (
              <NavLink link="/auth/signin" logo={<ArrowRightOnRectangleIcon />} label="Sign In" />
            )}

            <hr
              style={{ margin: "1rem 0" }}
              className="border-t border-gray-200 dark:border-gray-700"
            />

            <NavAnchor
              href="#"
              onClick={e => {
                e.preventDefault()
                subscribe(router.pathname)
              }}
              logo={<UserPlusIcon />}
              label="Upgrade To Pro"
            />
            <NavLink link="/terms/terms" logo={<GlobeAltIcon />} label="Terms and Conditions" />
            <NavLink link="/terms/privacy" logo={<DocumentTextIcon />} label="Privacy Policy" />
            <NavLink link="/support" logo={<ChatBubbleLeftEllipsisIcon />} label="Support" />
          </ul>
          {companies && (
            <Dropdown label="Company">
              {companies.map(({ companyName, id: accountId }) => (
                <Dropdown.Item key={accountId}>{companyName}</Dropdown.Item>
              ))}
            </Dropdown>
          )}
        </nav>
      </header>
      <div className="hidden w-64 sm:block" />

      <main className="flex min-h-screen flex-1 flex-col items-center">{children}</main>
    </div>
  )
}

type NavInnerProps = {
  logo: JSX.Element
  label: string
  notification?: string
  extra?: string
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
const NavAnchor = ({
  onClick,
  href,
  ...props
}: {
  onClick?: MouseEventHandler<HTMLAnchorElement>
  href: string
} & NavInnerProps) => (
  <li>
    <a
      href={href}
      onClick={onClick}
      className="flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
    >
      <NavItemInner {...props} />
    </a>
  </li>
)
const NavItemInner = ({ logo, label, notification, extra }: NavInnerProps) => (
  <>
    <div className="h-6 w-6 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">
      {logo}
    </div>
    <span className="ml-3 flex-1 whitespace-nowrap">{label}</span>
    {notification ? (
      <span className="ml-3 inline-flex h-3 w-3 items-center justify-center rounded-full bg-blue-100 p-3 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
        {notification}
      </span>
    ) : null}
    {extra ? (
      <span className="ml-3 inline-flex items-center justify-center rounded-full bg-gray-200 px-2 text-sm font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        {extra}
      </span>
    ) : null}
  </>
)

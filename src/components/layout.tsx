import type { MouseEventHandler, ReactNode } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"

import { Svg } from "../components/ui"

export default function Layout({ children }: { children: ReactNode }) {
  const { data: session } = useSession()

  // users who are not signed in will be redirected to the sign-in page
  if (!session?.user) return null

  return (
    <div className="flex flex-row">
      <header>
        <OpenSidebar />
        <Nav />
      </header>
      <div className="z-40 w-64" />

      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}

const Nav = () => (
  <nav
    id="separator-sidebar"
    className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform"
    aria-label="Sidebar"
  >
    <ul className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800 space-y-2 font-medium">
      <NavLink link="/" logo={<Svg.Dashboard />} label="Dashboard" />
      <NavLink link="services" logo={<Svg.Products />} label="Services" />
      <NavLink link="generate-receipts" logo={<Svg.SignUp />} label="Receipts" />
      <NavAnchor
        href="api/auth/signout"
        logo={<Svg.SignIn />}
        onClick={e => {
          e.preventDefault()
          signOut()
        }}
        label="Sign Out"
      />
      <hr style={{ margin: "1rem 0" }} className="border-t border-gray-200 dark:border-gray-700" />
      <NavLink link="documentaion" logo={<Svg.Documentation />} label="Documentation" />
      <NavLink link="help" logo={<Svg.Help />} label="Help" />
    </ul>
  </nav>
)

const OpenSidebar = () => (
  <button
    data-drawer-target="separator-sidebar"
    data-drawer-toggle="separator-sidebar"
    aria-controls="separator-sidebar"
    type="button"
    className="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
  >
    <span className="sr-only">Open sidebar</span>
    <div className="w-6 h-6">
      <Svg.Sidebar />
    </div>
  </button>
)

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
      className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
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
      className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <NavItemInner {...props} />
    </a>
  </li>
)
const NavItemInner = ({ logo, label, notification, extra }: NavInnerProps) => (
  <>
    <div className="w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
      {logo}
    </div>
    <span className="flex-1 ml-3 whitespace-nowrap">{label}</span>
    {notification ? (
      <span className="inline-flex items-center justify-center w-3 h-3 p-3 ml-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">
        {notification}
      </span>
    ) : null}
    {extra ? (
      <span className="inline-flex items-center justify-center px-2 ml-3 text-sm font-medium text-gray-800 bg-gray-200 rounded-full dark:bg-gray-700 dark:text-gray-300">
        Pro
      </span>
    ) : null}
  </>
)

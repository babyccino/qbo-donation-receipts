import { MouseEventHandler, ReactNode, useState, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/router"

import { Svg, Link } from "@/components/ui"
import { subscribe } from "@/lib/util/request"

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user
  const [showSidebar, setShowSidebar] = useState(false)

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
          <div className="h-6 w-6">
            <Svg.Sidebar />
          </div>
        </button>
        {showSidebar && (
          <div
            className="fixed inset-0 z-20 animate-fadeIn bg-black/40"
            onClick={() => setShowSidebar(false)}
          />
        )}
        <nav
          id="separator-sidebar"
          className={
            "fixed left-0 top-0 z-40 h-screen w-64 transition-transform sm:translate-x-0" +
            (showSidebar ? "" : " -translate-x-full")
          }
          aria-label="Sidebar"
        >
          <ul className="h-full space-y-2 overflow-y-auto bg-gray-50 px-3 py-4 font-medium dark:bg-gray-800">
            <NavLink link="/" logo={<Svg.Dashboard />} label="Dashboard" />
            <NavLink link="services" logo={<Svg.Products />} label="Items" />
            <NavLink link="details" logo={<Svg.Components />} label="Details" />
            <NavLink link="generate-receipts" logo={<Svg.SignUp />} label="Receipts" />
            {user && <NavLink link="account" logo={<Svg.Users />} label="Account" />}
            {user ? (
              <NavAnchor
                href="api/auth/signout"
                logo={<Svg.SignIn />}
                onClick={e => {
                  e.preventDefault()
                  signOut({ callbackUrl: "/disconnected" })
                }}
                label="Sign Out"
              />
            ) : (
              <NavLink link="api/auth/signin" logo={<Svg.SignIn />} label="Sign In" />
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
              logo={<Svg.Upgrade />}
              label="Upgrade To Pro"
            />
            <NavLink link="terms" logo={<Svg.Help />} label="Terms and Conditions" />
            <NavLink link="privacy" logo={<Svg.Documentation />} label="Privacy Policy" />
            <NavLink link="support" logo={<Svg.Inbox2 />} label="Support" />
          </ul>
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

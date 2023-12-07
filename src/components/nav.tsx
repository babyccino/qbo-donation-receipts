"use client"

import {
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid"
import { signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { MouseEventHandler } from "react"

import { NavInnerProps, NavItemInner, NavLink } from "@/components/nav-server"
import { subscribe } from "@/lib/util/request"

export const NavAnchor = ({
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
export const SignOut = () => (
  <NavAnchor
    href="/api/auth/signout"
    logo={<ArrowLeftOnRectangleIcon />}
    onClick={e => {
      e.preventDefault()
      signOut()
    }}
    label="Sign Out"
  />
)
export const SignIn = () => {
  const pathname = usePathname()
  return (
    <NavLink
      link={`/auth/signin?callback=${pathname}`}
      logo={<ArrowRightOnRectangleIcon />}
      label="Sign In"
    />
  )
}
export const Upgrade = () => (
  <NavAnchor
    href="#"
    onClick={e => {
      e.preventDefault()
      subscribe("/")
    }}
    logo={<UserPlusIcon />}
    label="Upgrade To Pro"
  />
)

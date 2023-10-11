"use client"

import { ArrowLeftOnRectangleIcon, UserPlusIcon } from "@heroicons/react/24/solid"

import { MouseEventHandler } from "react"
import { signOut } from "next-auth/react"
import { subscribe } from "@/lib/util/request"

export type NavInnerProps = {
  logo: JSX.Element
  label: string
  notification?: string
  extra?: string
}

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
export const NavItemInner = ({ logo, label, notification, extra }: NavInnerProps) => (
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

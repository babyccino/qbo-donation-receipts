"use client"

import { CheckIcon } from "@heroicons/react/24/solid"
import Link from "next/link"
import { ReactNode } from "react"
import { twMerge } from "tailwind-merge"

export const Card = ({
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
export const Body = ({ children }: { children?: ReactNode }) => (
  <p className="font-normal text-gray-700 dark:text-gray-400">{children}</p>
)
export const Title = ({ children }: { children?: ReactNode }) => (
  <h6 className="mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
    {children}
  </h6>
)
export const Tick = () => <CheckIcon className="absolute right-2 top-4 h-8 w-8 text-green-400" />
export const Note = ({ children }: { children?: ReactNode }) => (
  <p className="mt-4 font-bold text-green-400">{children}</p>
)

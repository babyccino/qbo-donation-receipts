import { MouseEventHandler, ReactNode } from "react"
import { multipleClasses } from "../lib/util"

export const buttonStyling =
  "text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
export const Button = ({
  onClick,
  children,
  className,
}: {
  onClick?: MouseEventHandler<HTMLButtonElement>
  children: ReactNode
  className?: string
}) => (
  <button onClick={onClick} className={multipleClasses(buttonStyling, className)}>
    {children}
  </button>
)

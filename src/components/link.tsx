import { Spinner } from "flowbite-react"
import NextLink from "next/link"
import { ComponentProps, useState } from "react"
import { twMerge } from "tailwind-merge"

export const buttonStyling =
  "inline-block text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-[1.125rem] py-2.5 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800 border border-transparent cursor-pointer"

export const Link = (props: ComponentProps<typeof NextLink>) => (
  <NextLink {...props} className={twMerge(props.className, buttonStyling)}></NextLink>
)
export function LoadingLink(props: ComponentProps<typeof NextLink>) {
  const [loading, setLoading] = useState(false)

  if (!loading)
    return (
      <div className={twMerge(props.className, buttonStyling, "relative cursor-wait")}>
        <div className="absolute left-1/2 -translate-x-1/2">
          <Spinner />
        </div>
        <span className="opacity-0">{props.children}</span>
      </div>
    )
  return (
    <NextLink
      {...props}
      onClick={e => {
        setLoading(true)
        props.onClick?.(e)
      }}
      className={twMerge(props.className, buttonStyling)}
    >
      {props.children}
    </NextLink>
  )
}

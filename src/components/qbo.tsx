import { twMerge } from "tailwind-merge"

import QBOSignInDefault from "@/public/svg/qbo/qbo-sign-in-default.svg"
import QBOSignInHover from "@/public/svg/qbo/qbo-sign-in-hover.svg"
import QBOConnectDefault from "@/public/svg/qbo/qbo-connect-default.svg"
import QBOConnectHover from "@/public/svg/qbo/qbo-connect-hover.svg"

export const SignIn = ({ disabled }: { disabled?: boolean }) => (
  <span className={twMerge("group relative", disabled && "brightness-50 filter")}>
    <QBOSignInDefault className={twMerge("absolute z-10", !disabled && "group-hover:hidden")} />
    <QBOSignInHover />
  </span>
)

export const Connect = ({ disabled }: { disabled?: boolean }) => (
  <span className={twMerge("group relative", disabled && "brightness-50 filter")}>
    <QBOConnectDefault className={twMerge("absolute z-10", !disabled && "group-hover:hidden")} />
    <QBOConnectHover />
  </span>
)

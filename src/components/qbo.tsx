import { ComponentProps, HTMLProps } from "react"
import { Svg } from "@/components/ui"
import { twMerge } from "tailwind-merge"

export const SignIn = ({ className, ...props }: ComponentProps<"button">) => (
  <button
    {...props}
    className={twMerge(className, "group relative", props.disabled && "brightness-50 filter")}
  >
    <div className={twMerge("absolute z-10", !props.disabled && "group-hover:hidden")}>
      <Svg.QBOSignInDefault />
    </div>
    <Svg.QBOSignInHover />
  </button>
)

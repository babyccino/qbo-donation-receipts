import { Svg } from "@/components/ui"
import { twMerge } from "tailwind-merge"

export const SignIn = ({ disabled }: { disabled?: boolean }) => (
  <span className={twMerge("group relative", disabled && "brightness-50 filter")}>
    <div className={twMerge("absolute z-10", !disabled && "group-hover:hidden")}>
      <Svg.QBOSignInDefault />
    </div>
    <Svg.QBOSignInHover />
  </span>
)

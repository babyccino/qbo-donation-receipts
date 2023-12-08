import { Textarea as FlowbiteTextArea } from "flowbite-react/lib/esm/components/Textarea"
import { TextInput as FlowbiteTextInput } from "flowbite-react/lib/esm/components/TextInput"
import { Label } from "flowbite-react/lib/esm/components/Label"
import {
  ChangeEventHandler,
  FieldsetHTMLAttributes,
  ForwardedRef,
  HTMLAttributes,
  HTMLInputTypeAttribute,
  forwardRef,
} from "react"

import { twMerge } from "tailwind-merge"

// components from flowbite.com
// svg from heroicons.dev
// hand drawn arrows from svgrepo.com

type ToggleProps = {
  className?: string
  id: string
  defaultChecked: boolean
  label: string
  disabled?: boolean
  onChange?: ChangeEventHandler<HTMLInputElement>
  size?: "sm" | "md"
}
const _Toggle = (
  { className, id, defaultChecked, label, onChange, disabled, size }: ToggleProps,
  ref: ForwardedRef<HTMLInputElement>,
) => (
  <p className={className}>
    <label
      htmlFor={id.toString()}
      className={twMerge(
        "relative mb-3 inline-flex cursor-pointer items-center",
        size === "sm" ? "mb-3" : "mb-5",
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        ref={ref}
        name="items"
        value={id}
        id={id}
        disabled={disabled}
        onChange={onChange}
        // if the user has already made a selection then the list will be prefilled with that data
        // otherwise all will be marked by default
        defaultChecked={defaultChecked}
      />
      <div
        className={twMerge(
          "peer rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800",
          size === "sm" ? "h-5 w-9 after:h-4 after:w-4" : "h-6 w-11 after:h-5 after:w-5",
        )}
      />
      <span
        className={twMerge(
          "ml-3 font-medium text-gray-900 dark:text-gray-300",
          disabled && "line-through",
          size === "sm" ? "text-xs" : "text-sm",
        )}
      >
        {label}
      </span>
    </label>
  </p>
)
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(_Toggle)

export const TextInput = ({
  id,
  label,
  defaultValue,
  placeholder,
  minLength,
  className,
  required,
  type,
}: {
  id: string
  label: string
  defaultValue?: string
  placeholder?: string
  minLength?: number
  className?: string
  required?: boolean
  type?: HTMLInputTypeAttribute
}) => (
  <p className={className}>
    <Label className="mb-2 inline-block" htmlFor={id}>
      {label}
    </Label>
    <FlowbiteTextInput
      name={id}
      id={id}
      minLength={minLength}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      type={type}
    />
  </p>
)

export const TextArea = ({
  id,
  label,
  rows,
  defaultValue,
  placeholder,
  minLength,
  className,
  required,
  onChange,
}: {
  id: string
  label: string
  rows?: number
  defaultValue?: string
  placeholder?: string
  minLength?: number
  className?: string
  required?: boolean
  onChange?: ChangeEventHandler<HTMLTextAreaElement>
}) => (
  <p className={className}>
    <Label className="mb-2 inline-block" htmlFor={id}>
      {label}
    </Label>
    <FlowbiteTextArea
      name={id}
      id={id}
      minLength={minLength}
      rows={rows}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
      onChange={onChange}
    />
  </p>
)

export const Legend = ({ children, className }: HTMLAttributes<HTMLLegendElement>) => (
  <legend
    className={twMerge(
      className,
      "font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl",
    )}
  >
    {children}
  </legend>
)

export const Fieldset = ({ children, className }: FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
  <fieldset
    className={twMerge(
      "m-auto w-full rounded-lg bg-white p-6 pt-5 shadow dark:border dark:border-gray-700 dark:bg-gray-800 md:mt-0",
      className,
    )}
  >
    {children}
  </fieldset>
)

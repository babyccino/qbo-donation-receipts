import {
  ChangeEventHandler,
  FieldsetHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  useState,
  forwardRef,
  ForwardedRef,
  HTMLInputTypeAttribute,
} from "react"
import {
  FileInput,
  Label as FlowbiteLabel,
  TextInput as FlowbiteTextInput,
  Textarea as FlowbiteTextArea,
} from "flowbite-react"
export { Select, Checkbox } from "flowbite-react"

import { twMerge } from "tailwind-merge"

// components from flowbite.com
// svg from heroicons.dev
// hand drawn arrows from svgrepo.com

export const Label = FlowbiteLabel

type ToggleProps = {
  className?: string
  id: number
  defaultChecked: boolean
  label: string
}
const _Toggle = (
  { className, id, defaultChecked, label }: ToggleProps,
  ref: ForwardedRef<HTMLInputElement>
) => (
  <p className={className}>
    <label
      htmlFor={id.toString()}
      className="relative mb-4 inline-flex cursor-pointer items-center"
    >
      <input
        className="peer sr-only"
        ref={ref}
        type="checkbox"
        name="items"
        value={id}
        id={id.toString()}
        // if the user has already made a selection then the list will be prefilled with that data
        // otherwise all will be marked by default
        defaultChecked={defaultChecked}
      />
      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800" />
      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">{label}</span>
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
    <FlowbiteLabel className="mb-2 inline-block" htmlFor={id}>
      {label}
    </FlowbiteLabel>
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
    <FlowbiteLabel className="mb-2 inline-block" htmlFor={id}>
      {label}
    </FlowbiteLabel>
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
      "font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl"
    )}
  >
    {children}
  </legend>
)

export const Fieldset = ({ children, className }: FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
  <fieldset
    className={twMerge(
      className,
      "m-auto w-full rounded-lg bg-white p-6 pt-5 shadow dark:border dark:border-gray-700 dark:bg-gray-800 md:mt-0"
    )}
  >
    {children}
  </fieldset>
)
export function ImageInput({
  label,
  id,
  helper,
  required,
}: {
  label: string
  id: string
  helper?: ReactNode
  required?: boolean
}) {
  const [error, setError] = useState(false)

  const handleFileInput: ChangeEventHandler<HTMLInputElement> = event => {
    event.preventDefault()
    const files = event.target.files
    if (!files || files.length === 0) return
    const extension = files[0].name.split(".").pop()
    if (!extension || (extension !== "jpg" && extension !== "jpeg" && extension !== "png")) {
      // Todo check dimensions of image
      event.target.value = ""
      return setError(true)
    } else setError(false)
  }

  return (
    <p>
      <FlowbiteLabel className="mb-2 inline-block" htmlFor={id}>
        {label}
      </FlowbiteLabel>
      <FileInput
        id={id}
        name={id}
        required={required}
        onChange={handleFileInput}
        color={error ? "failure" : undefined}
        helperText={helper}
      />
    </p>
  )
}

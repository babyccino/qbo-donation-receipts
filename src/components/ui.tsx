import {
  ChangeEventHandler,
  FieldsetHTMLAttributes,
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
  useState,
} from "react"
import { multipleClasses } from "@/lib/util"

// from flowbite.com

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

export namespace Svg {
  export const Sidebar = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
      />
    </svg>
  )
  export const Kanban = () => (
    <svg
      aria-hidden="true"
      className="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
    </svg>
  )
  export const Dashboard = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
    </svg>
  )
  export const Help = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.796a4.002 4.002 0 01-.041-2.08l-.08.08-1.53-1.533A5.98 5.98 0 004 10c0 .954.223 1.856.619 2.657l1.54-1.54zm1.088-6.45A5.974 5.974 0 0110 4c.954 0 1.856.223 2.657.619l-1.54 1.54a4.002 4.002 0 00-2.346.033L7.246 4.668zM12 10a2 2 0 11-4 0 2 2 0 014 0z"
        clipRule="evenodd"
      ></path>
    </svg>
  )
  export const Components = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"></path>
    </svg>
  )
  export const Documentation = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
      <path
        fillRule="evenodd"
        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
        clipRule="evenodd"
      ></path>
    </svg>
  )
  export const Upgrade = () => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fas"
      data-icon="gem"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
    >
      <path
        fill="currentColor"
        d="M378.7 32H133.3L256 182.7L378.7 32zM512 192l-107.4-141.3L289.6 192H512zM107.4 50.67L0 192h222.4L107.4 50.67zM244.3 474.9C247.3 478.2 251.6 480 256 480s8.653-1.828 11.67-5.062L510.6 224H1.365L244.3 474.9z"
      ></path>
    </svg>
  )
  export const Products = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      ></path>
    </svg>
  )
  export const Users = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clipRule="evenodd"
      ></path>
    </svg>
  )
  export const SignUp = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
        clipRule="evenodd"
      ></path>
    </svg>
  )
  export const Inbox = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L11 7.586V3a1 1 0 10-2 0v4.586l-.293-.293z"></path>
      <path d="M3 5a2 2 0 012-2h1a1 1 0 010 2H5v7h2l1 2h4l1-2h2V5h-1a1 1 0 110-2h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"></path>
    </svg>
  )
  export const SignIn = () => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
        clipRule="evenodd"
      ></path>
    </svg>
  )
}

export namespace Form {
  export const TextInput = ({
    id,
    defaultValue,
    minLength,
    label,
  }: {
    id: string
    label: string
    defaultValue?: string
    minLength?: number
  }) => (
    <p>
      <Label htmlFor={id}>{label}</Label>
      <input
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        required
        minLength={minLength}
        type="text"
        id={id}
        name={id}
        defaultValue={defaultValue}
      />
    </p>
  )

  export const DateInput = ({
    label,
    id,
    defaultValue,
    disabled,
  }: {
    label: string
    id: string
    defaultValue?: string
    disabled?: boolean
  }) => (
    <p>
      <Label htmlFor={id} disabled={disabled}>
        {label}
      </Label>
      <input
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:text-gray-400"
        type="date"
        id={id}
        name={id}
        defaultValue={defaultValue}
        disabled={disabled}
        required
      />
    </p>
  )

  export const Label = ({
    htmlFor,
    children,
    disabled,
  }: {
    htmlFor: string
    children: ReactNode
    disabled?: boolean
  }) => (
    <label
      htmlFor={htmlFor}
      className={
        "block mb-2 text-sm font-medium " +
        (disabled ? "text-gray-400" : "text-gray-900 dark:text-white")
      }
    >
      {children}
    </label>
  )

  export const Legend = ({ children, className }: HTMLAttributes<HTMLLegendElement>) => (
    <legend
      className={multipleClasses(
        className,
        "font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white mb-3"
      )}
    >
      {children}
    </legend>
  )

  export const Fieldset = ({
    children,
    className,
  }: FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
    <fieldset
      className={multipleClasses(
        className,
        "w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md p-6 pt-5 dark:bg-gray-800 dark:border-gray-700 m-auto"
      )}
    >
      {children}
    </fieldset>
  )

  const imageInputStyling = {
    input: {
      regular:
        "transition-all block w-full text-sm border rounded-lg cursor-pointer focus:outline-none text-gray-900 border-gray-300 bg-gray-50 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400",
      error:
        "transition-all block w-full text-sm border rounded-lg cursor-pointer focus:outline-none bg-red-50 border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500 dark:bg-red-100 dark:border-red-400",
    },
    helper: {
      regular: "transition-all mt-1 text-xs text-gray-500 dark:text-gray-300",
      error: "transition-all mt-1 text-xs font-bold text-red-900 dark:text-red-500",
    },
  }
  export function ImageInput({
    label,
    id,
    helper,
    required,
  }: {
    label: string
    id: string
    helper?: string
    required?: boolean
  }) {
    const [error, setError] = useState(false)

    const handleFileInput: ChangeEventHandler<HTMLInputElement> = event => {
      event.preventDefault()
      const files = event.target.files
      if (!files || files.length === 0) return
      const extension = files[0].name.split(".").pop()
      if (!extension || (extension !== "jpg" && extension !== "jpeg" && extension !== "png")) {
        event.target.value = ""
        return setError(true)
      } else setError(false)
    }

    return (
      <p>
        <Label htmlFor={id}>{label}</Label>
        <input
          className={error ? imageInputStyling.input.error : imageInputStyling.input.regular}
          type="file"
          id={id}
          name={id}
          required={required}
          onChange={handleFileInput}
        />
        {helper && (
          <p
            className={error ? imageInputStyling.helper.error : imageInputStyling.helper.regular}
            id={id}
          >
            {helper}
          </p>
        )}
      </p>
    )
  }
}

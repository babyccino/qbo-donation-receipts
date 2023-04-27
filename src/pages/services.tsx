import {
  ChangeEventHandler,
  FieldsetHTMLAttributes,
  FormEventHandler,
  HTMLAttributes,
  LabelHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  useRef,
  useState,
} from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { getServerSession } from "next-auth"

import { CompanyInfo, Item, getCompanyInfo, getItems } from "../lib/qbo-api"
import {
  DateRangeType,
  Session,
  endOfPreviousYearHtml,
  endOfThisYearHtml,
  multipleClasses,
  startOfPreviousYearHtml,
  startOfThisYearHtml,
} from "../lib/util"
import { authOptions } from "./api/auth/[...nextauth]"
import { Button, buttonStyling } from "../components/ui"

// const DEBOUNCE = 500

function getStartEndDates(
  dateRangeType: DateRangeType,
  customDateRange: string[]
): [string, string] {
  switch (dateRangeType) {
    case DateRangeType.LastYear:
      return [startOfPreviousYearHtml(), endOfPreviousYearHtml()]
    case DateRangeType.ThisYear:
      return [startOfThisYearHtml(), endOfThisYearHtml()]
    case DateRangeType.Ytd:
      return [startOfThisYearHtml(), endOfThisYearHtml()]
    case DateRangeType.Custom:
      if (customDateRange.length !== 2)
        throw new Error(
          "Custom date range selected but custom dates not provided" +
            JSON.stringify({ customDateRange })
        )
      return [customDateRange[0], customDateRange[1]]
  }
}

type Props = {
  items: Item[]
  companyInfo: CompanyInfo
  session: Session
}

export default function Services({ items, companyInfo }: Props) {
  const router = useRouter()
  const inputRefs = useRef<HTMLInputElement[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedValue, setSelectedValue] = useState<DateRangeType>(DateRangeType.LastYear)
  const dateRangeIsCustom = selectedValue === DateRangeType.Custom

  const handleSelectChange: ChangeEventHandler<HTMLSelectElement> = event =>
    setSelectedValue(event.target.value as DateRangeType)

  // TODO save user's selected items in db
  // const debounceRef = useRef<number>(-1)
  // const sendFormData = () => {
  //   if (!formRef.current) throw new Error()

  //   const formData = new FormData(formRef.current)
  //   const selectedItems = new Set(formData.keys())
  //   console.log(selectedItems)
  // }

  // const debounce = () => {
  //   clearTimeout(debounceRef.current)
  //   debounceRef.current = setTimeout(sendFormData, DEBOUNCE) as any
  // }

  const previousYear = new Date().getFullYear() - 1

  const checkAll: MouseEventHandler<HTMLButtonElement> = event => {
    event.preventDefault()
    for (const el of inputRefs.current) {
      el.checked = true
    }
  }

  const unCheckAll: MouseEventHandler<HTMLButtonElement> = event => {
    event.preventDefault()
    for (const el of inputRefs.current) {
      el.checked = false
    }
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = event => {
    if (!formRef.current) throw new Error()
    event.preventDefault()

    const formData = new FormData(formRef.current)

    const items = formData.getAll("items") as string[]

    const dateRangeType = formData.get("dateRangeType")
    if (!dateRangeType) throw new Error("dateRangeType is undefined")
    const [startDate, endDate] = getStartEndDates(
      dateRangeType as DateRangeType,
      formData.getAll("dateRange") as string[]
    )

    const companyName = formData.get("companyName") as string
    const address = formData.get("address") as string
    const country = formData.get("country") as string
    const registrationNumber = formData.get("registrationNumber") as string
    const signatoryName = formData.get("signatoryName") as string
    const signature = formData.get("signature") as string
    const smallLogo = formData.get("smallLogo") as string

    const query = {
      items: items.join("+"),
      startDate,
      endDate,
      companyName: companyName !== companyInfo.name ? companyName : undefined,
      address: address !== companyInfo.address ? address : undefined,
      country: country !== companyInfo.country ? country : undefined,
      registrationNumber,
      signatoryName,
      signature,
      smallLogo,
    }

    router.push({
      pathname: "generate-receipts",
      query,
    })
  }

  const mapItem = ({ id, name }: Item) => (
    <div key={id}>
      <label
        htmlFor={id.toString()}
        className="relative inline-flex items-center mb-4 cursor-pointer"
      >
        <input
          className="sr-only peer"
          ref={el => (el ? inputRefs.current.push(el) : null)}
          type="checkbox"
          name="items"
          value={id}
          id={id.toString()}
          defaultChecked
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">{name}</span>
      </label>
    </div>
  )

  return (
    <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-lg space-y-4 m-auto">
      <Fieldset>
        <Legend>Selected items</Legend>
        {items.map(mapItem)}
        <div className="pb-2 pt-1 space-x-2">
          <Button onClick={checkAll}>Check All</Button>
          <Button onClick={unCheckAll}>Uncheck All</Button>
        </div>
      </Fieldset>
      <Fieldset>
        <Legend>Date range</Legend>
        <Label htmlFor="dateRangeType">Range</Label>
        <select
          onChange={handleSelectChange}
          name="dateRangeType"
          id="dateRangeType"
          defaultValue={DateRangeType.LastYear}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        >
          <option value={DateRangeType.LastYear}>Last year</option>
          <option value={DateRangeType.ThisYear}>This year</option>
          <option value={DateRangeType.Ytd}>This year to date</option>
          <option value={DateRangeType.Custom}>Custom range</option>
        </select>
        {/* //TODO make states for start and end date and make sure start is always less than end */}
        <DateInput
          id="dateStart"
          defaultValue={`1970-01-01`}
          disabled={!dateRangeIsCustom}
          // TODO change to below for prod. Just have this as 1970 to fit the sandbox data
          // defaultValue={`${previousYear}-01-01`}
          label="Start date"
        />
        <DateInput
          id="dateEnd"
          disabled={!dateRangeIsCustom}
          defaultValue={`${previousYear}-12-31`}
          label="End date"
        />
      </Fieldset>
      <Fieldset>
        <Legend>Organisation</Legend>
        <TextInput id="companyName" defaultValue={companyInfo.name} label="Legal name" />
        <TextInput id="address" minLength={10} defaultValue={companyInfo.address} label="Address" />
        <TextInput id="country" minLength={2} defaultValue={companyInfo.country} label="Country" />
        <TextInput
          id="registrationNumber"
          minLength={15}
          defaultValue="123456789RR0001"
          label="Charity registration number"
        />
        <TextInput id="signatoryName" minLength={5} label="Signatory's name" />
        <TextInput id="signature" label="Image of signatory's signature" />
        <TextInput id="smallLogo" label="Small image of organisation's logo" />
      </Fieldset>
      <input
        className={buttonStyling + " cursor-pointer block mx-auto text-xl"}
        type="submit"
        value="Submit"
      />
    </form>
  )
}

const TextInput = ({
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

const DateInput = ({
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
      name="dateRange"
      defaultValue={defaultValue}
      disabled={disabled}
    />
  </p>
)

const Label = ({
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

const Legend = ({ children, className }: HTMLAttributes<HTMLLegendElement>) => (
  <legend
    className={multipleClasses(
      className,
      "font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white mb-3"
    )}
  >
    {children}
  </legend>
)

const Fieldset = ({ children, className }: FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
  <fieldset
    className={multipleClasses(
      className,
      "w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md p-6 pt-5 dark:bg-gray-800 dark:border-gray-700 m-auto"
    )}
  >
    {children}
  </fieldset>
)

// --- server-side props ---\

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const [companyInfo, items] = await Promise.all([getCompanyInfo(session), getItems(session)])

  return {
    props: {
      session,
      items,
      companyInfo,
    },
  }
}

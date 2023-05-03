import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useRef, useState } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { getServerSession } from "next-auth"

import { Item, getItems } from "@/lib/qbo-api"
import {
  DateRangeType,
  Session,
  endOfPreviousYearHtml,
  endOfThisYearHtml,
  startOfPreviousYearHtml,
  startOfThisYearHtml,
} from "@/lib/util"
import { authOptions } from "./api/auth/[...nextauth]"
import { Button, Form, buttonStyling } from "@/components/ui"

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
  session: Session
}

export default function Services({ items }: Props) {
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

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    if (!formRef.current) throw new Error()
    event.preventDefault()

    const formData = new FormData(formRef.current)

    const items = (formData.getAll("items") as string[]).map(item => parseInt(item))

    const dateRangeType = formData.get("dateRangeType")
    if (!dateRangeType) throw new Error("dateRangeType is undefined")
    const [startDate, endDate] = getStartEndDates(
      dateRangeType as DateRangeType,
      formData.getAll("dateRange") as string[]
    )

    const query = {
      items,
      date: {
        startDate,
        endDate,
      },
    }

    const response = fetch("/api/services", {
      method: "POST",
      body: JSON.stringify(query),
    })

    router.push({
      pathname: "details",
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
      <Form.Fieldset>
        <Form.Legend>Selected items</Form.Legend>
        {items.map(mapItem)}
        <div className="pb-2 pt-1 space-x-2">
          <Button onClick={checkAll}>Check All</Button>
          <Button onClick={unCheckAll}>Uncheck All</Button>
        </div>
      </Form.Fieldset>
      <Form.Fieldset>
        <Form.Legend>Date range</Form.Legend>
        <Form.Label htmlFor="dateRangeType">Range</Form.Label>
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
        <Form.DateInput
          id="dateStart"
          defaultValue={`1970-01-01`}
          disabled={!dateRangeIsCustom}
          // TODO change to below for prod. Just have this as 1970 to fit the sandbox data
          // defaultValue={`${previousYear}-01-01`}
          label="Start date"
        />
        <Form.DateInput
          id="dateEnd"
          disabled={!dateRangeIsCustom}
          defaultValue={`${previousYear}-12-31`}
          label="End date"
        />
      </Form.Fieldset>
      <input
        className={buttonStyling + " cursor-pointer block mx-auto text-l"}
        type="submit"
        value="Enter Donee Details"
      />
    </form>
  )
}

// --- server-side props ---\

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  return {
    props: {
      session,
      items: await getItems(session),
    },
  }
}

import { ChangeEventHandler, MouseEventHandler, useRef, useState } from "react"
import { useRouter } from "next/router"

import { ItemQueryResponseItem } from "../lib/qbo-api"
import {
  DateRangeType,
  endOfPreviousYearHtml,
  endOfThisYearHtml,
  startOfPreviousYearHtml,
  startOfThisYearHtml,
} from "../lib/util"

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

export default function Services({ items }: { items: ItemQueryResponseItem[] }) {
  const inputRefs = useRef<HTMLInputElement[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedValue, setSelectedValue] = useState<DateRangeType>(DateRangeType.LastYear)
  const router = useRouter()

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

  return (
    <form
      ref={formRef}
      onSubmit={event => {
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

        router.push({
          pathname: "generate-receipts",
          query: { items: items.join("+"), startDate, endDate },
        })
      }}
    >
      <fieldset>
        <legend>Selected items</legend>
        {items.map(item => (
          <div key={item.Id}>
            <input
              ref={el => (el ? inputRefs.current.push(el) : null)}
              type="checkbox"
              name="items"
              value={item.Id}
              id={item.Id}
            />
            <label htmlFor={item.Id}>{item.Name}</label>
            <br />
          </div>
        ))}
        <button onClick={checkAll}>Check All</button>
        <button onClick={unCheckAll}>Uncheck All</button>
      </fieldset>
      <fieldset>
        <legend>Date range</legend>
        <label htmlFor="dateRangeType">Date range </label>
        <select onChange={handleSelectChange} name="dateRangeType" id="dateRangeType">
          <option selected value={DateRangeType.LastYear}>
            Last year
          </option>
          <option value={DateRangeType.ThisYear}>This year</option>
          <option value={DateRangeType.Ytd}>This year to date</option>
          <option value={DateRangeType.Custom}>Custom range</option>
        </select>
        {/* //TODO make states for start and end date and make sure start is always less than end */}
        {selectedValue === DateRangeType.Custom ? (
          <>
            <p>
              <label htmlFor="start">Start date </label>
              <input
                type="date"
                id="dateStart"
                name="dateRange"
                defaultValue={`1970-01-01`}
                // TODO change to below for prod. Just have this as 1970 to fit the sandbox data
                // defaultValue={`${previousYear}-01-01`}
              />
            </p>
            <p>
              <label htmlFor="end">End date </label>
              <input
                type="date"
                id="dateSnd"
                name="dateRange"
                defaultValue={`${previousYear}-12-31`}
              />
            </p>
          </>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>Organisation</legend>
        <p>
          <label htmlFor="end">End date </label>
          <input type="text" id="dateSnd" name="dateRange" defaultValue={`${previousYear}-12-31`} />
        </p>
      </fieldset>
      <input type="submit" value="Submit" />
    </form>
  )
}

// --- server-side props ---

import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]"
import { Session } from "../lib/util"
import { getItemData } from "../lib/qbo-api"

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const itemQueryResponse = await getItemData(session)
  const items = itemQueryResponse.QueryResponse.Item

  return {
    props: {
      session,
      items,
    },
  }
}

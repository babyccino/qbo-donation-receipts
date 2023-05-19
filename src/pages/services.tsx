import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useRef, useState } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { Session, getServerSession } from "next-auth"
import Datepicker from "react-tailwindcss-datepicker"

import { Item, getItems } from "@/lib/qbo-api"
import {
  DateRangeType,
  endOfPreviousYear,
  endOfThisYear,
  formatDateHtmlReverse,
  startOfPreviousYear,
  startOfThisYear,
} from "@/lib/util"
import { authOptions } from "./api/auth/[...nextauth]"
import { Form, buttonStyling, Button } from "@/components/ui"
import { user } from "@/lib/db"
import { alreadyFilledIn, postJsonData } from "@/lib/app-api"

type Props = {
  items: Item[]
  session: Session
  selectedItems: number[] | null
  detailsFilledIn: boolean
}

type DateValueType = { startDate: Date | string | null; endDate: Date | string | null } | null

export default function Services({ items, selectedItems, detailsFilledIn }: Props) {
  const router = useRouter()
  const inputRefs = useRef<HTMLInputElement[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const [dateRangeState, setDateRangeState] = useState<DateRangeType>(DateRangeType.LastYear)
  const dateRangeIsCustom = dateRangeState === DateRangeType.Custom

  const previousYear = new Date().getFullYear() - 1
  const [customDateState, setCustomDateState] = useState({
    // startDate: new Date(`${previousYear}/01/01`),
    // change to above in prod
    startDate: new Date(`1970/01/01`),
    endDate: new Date(`${previousYear}/12/31`),
  })
  const onDateChange = (date: DateValueType) => {
    if (!date || !date.endDate || !date.startDate) return
    const startDate = typeof date.startDate == "string" ? new Date(date.startDate) : date.startDate
    const endDate = typeof date.endDate == "string" ? new Date(date.endDate) : date.endDate
    setCustomDateState({ startDate, endDate })
  }

  const handleSelectChange: ChangeEventHandler<HTMLSelectElement> = event => {
    const dateRangeType = event.target.value as DateRangeType
    setDateRangeState(dateRangeType)

    switch (dateRangeType) {
      case DateRangeType.ThisYear:
        return setCustomDateState({ startDate: startOfThisYear(), endDate: endOfThisYear() })
      case DateRangeType.Ytd:
        return setCustomDateState({ startDate: startOfThisYear(), endDate: new Date() })
      case DateRangeType.LastYear:
      case DateRangeType.Custom:
      default:
        return setCustomDateState({
          startDate: startOfPreviousYear(),
          endDate: endOfPreviousYear(),
        })
    }
  }

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

  const getItems = () => {
    if (!formRef.current) throw new Error("Form html element has not yet been initialised")

    const formData = new FormData(formRef.current)
    return (formData.getAll("items") as string[]).map(item => parseInt(item))
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()

    const items = getItems()
    const apiResponse = postJsonData("/api/services", { items, date: customDateState })

    console.log({ formData: items })

    // the selected items will be in the query in case the db has not been updated by...
    // the time the user has reached the generate-receipts pages
    if (detailsFilledIn)
      router.push({
        pathname: "generate-receipts",
        query: {
          items: items.join("+"),
          startDate: formatDateHtmlReverse(customDateState.startDate),
          endDate: formatDateHtmlReverse(customDateState.endDate),
        },
      })
    else
      router.push({
        pathname: "details",
        query: { items: true },
      })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="w-full max-w-lg space-y-4 m-auto">
      <Form.Fieldset>
        <Form.Legend className="mb-4">Selected items</Form.Legend>
        {items.map(({ id, name }) => (
          <Form.Toggle
            key={id}
            defaultChecked={selectedItems ? selectedItems.includes(id) : true}
            id={id}
            label={name}
            ref={el => (el ? inputRefs.current.push(el) : null)}
          />
        ))}
        <div className="pb-2 pt-1 flex flex-row gap-2">
          <Button onClick={checkAll}>Check All</Button>
          <Button onClick={unCheckAll}>Uncheck All</Button>
        </div>
      </Form.Fieldset>
      <Form.Fieldset>
        <Form.Legend className="mb-4">Date range</Form.Legend>
        <Form.Label className="inline-block mb-2" htmlFor="dateRangeType">
          Range
        </Form.Label>
        <Form.Select
          onChange={handleSelectChange}
          name="dateRangeType"
          id="dateRangeType"
          defaultValue={DateRangeType.LastYear}
        >
          <option value={DateRangeType.LastYear}>Last year</option>
          <option value={DateRangeType.ThisYear}>This year</option>
          <option value={DateRangeType.Ytd}>This year to date</option>
          <option value={DateRangeType.Custom}>Custom range</option>
        </Form.Select>
        <p className="space-y-1 mt-2">
          <Form.Label className="inline-block mb-2">Date Range</Form.Label>
          <Datepicker
            value={customDateState}
            onChange={onDateChange}
            disabled={!dateRangeIsCustom}
          />
        </p>
      </Form.Fieldset>
      <input
        className={buttonStyling + " cursor-pointer block mx-auto text-l"}
        type="submit"
        value={detailsFilledIn ? "Generate Receipts" : "Enter Donee Details"}
      />
    </form>
  )
}

// --- server-side props --- //

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) throw new Error("Couldn't find session")

  const [doc, items] = await Promise.all([user.doc(session.user.id).get(), getItems(session)])
  const data = doc.data()
  if (!data) throw new Error("User has no corresponding db entry")

  // TODO not showing correctly
  const selectedItems = data.items || null
  const detailsFilledIn = Boolean(context.query.details) || alreadyFilledIn(doc).doneeDetails

  return {
    props: {
      session,
      items,
      selectedItems,
      detailsFilledIn,
    },
  }
}

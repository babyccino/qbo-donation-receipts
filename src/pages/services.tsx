import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useRef, useState } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { Session, getServerSession } from "next-auth"
import Datepicker from "react-tailwindcss-datepicker"
import { Alert, Button } from "flowbite-react"

import { buttonStyling, Svg } from "@/components/ui"
import { Item, getItems } from "@/lib/qbo-api"
import {
  DateRangeType,
  endOfPreviousYear,
  endOfThisYear,
  startOfPreviousYear,
  startOfThisYear,
} from "@/lib/util/date"
import { postJsonData } from "@/lib/util/request"
import { authOptions } from "./api/auth/[...nextauth]"
import { user } from "@/lib/db"
import { alreadyFilledIn } from "@/lib/app-api"
import { DataType as ServicesApiDataType } from "@/pages/api/services"
import { Fieldset, Label, Legend, Select, Toggle } from "@/components/form"

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
    const postData: ServicesApiDataType = { items, date: customDateState }
    const apiResponse = await postJsonData("/api/services", postData)

    if (detailsFilledIn)
      router.push({
        pathname: "generate-receipts",
      })
    else
      router.push({
        pathname: "details",
        query: { items: true },
      })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="m-auto w-full max-w-lg space-y-4 p-4">
      <Fieldset>
        <Legend className="mb-3">Selected items</Legend>
        <Alert
          color="info"
          className="mb-4"
          icon={() => (
            <div className="mr-2 h-6 w-6">
              <Svg.Info />
            </div>
          )}
        >
          Make sure to only choose your Quickbooks sales items which qualify as donations
        </Alert>
        {items.map(({ id, name }) => (
          <Toggle
            key={id}
            defaultChecked={selectedItems ? selectedItems.includes(id) : true}
            id={id}
            label={name}
            ref={el => (el ? inputRefs.current.push(el) : null)}
          />
        ))}
        <div className="flex flex-row gap-2 pb-2 pt-1">
          <Button onClick={checkAll}>Check All</Button>
          <Button onClick={unCheckAll}>Uncheck All</Button>
        </div>
      </Fieldset>
      <Fieldset>
        <Legend className="mb-4">Date range</Legend>
        <Label className="mb-2 inline-block" htmlFor="dateRangeType">
          Range
        </Label>
        <Select
          onChange={handleSelectChange}
          name="dateRangeType"
          id="dateRangeType"
          defaultValue={DateRangeType.LastYear}
        >
          <option value={DateRangeType.LastYear}>Last year</option>
          <option value={DateRangeType.ThisYear}>This year</option>
          <option value={DateRangeType.Ytd}>This year to date</option>
          <option value={DateRangeType.Custom}>Custom range</option>
        </Select>
        <p className="mt-2 space-y-1">
          <Label className="mb-2 inline-block">Date Range</Label>
          <Datepicker
            value={customDateState}
            onChange={onDateChange}
            disabled={!dateRangeIsCustom}
          />
        </p>
      </Fieldset>
      <input
        className={buttonStyling + " text-l mx-auto block cursor-pointer"}
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
  const dbUser = doc.data()
  if (!dbUser) throw new Error("User has no corresponding db entry")

  // TODO not showing correctly
  const selectedItems = dbUser.items || null
  const detailsFilledIn = Boolean(context.query.details) || alreadyFilledIn(dbUser).doneeDetails

  return {
    props: {
      session,
      items,
      selectedItems,
      detailsFilledIn,
    },
  }
}

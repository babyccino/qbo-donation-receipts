import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useRef, useState } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { Session, getServerSession } from "next-auth"
import Datepicker from "react-tailwindcss-datepicker"
import { Alert, Button } from "flowbite-react"

import { buttonStyling, Svg } from "@/components/ui"
import { getItems } from "@/lib/qbo-api"
import { Item } from "@/types/qbo-api"
import {
  DateRangeType,
  endOfPreviousYear,
  endOfThisYear,
  startOfPreviousYear,
  startOfThisYear,
  utcEpoch,
} from "@/lib/util/date"
import { postJsonData } from "@/lib/util/request"
import { authOptions } from "./api/auth/[...nextauth]"
import { getUserData } from "@/lib/db"
import { DataType as ItemsApiDataType } from "@/pages/api/items"
import { Fieldset, Label, Legend, Select, Toggle } from "@/components/form"
import { disconnectedRedirect, isSessionQboConnected } from "@/lib/util/next-auth-helper"
import { checkUserDataCompletion } from "@/lib/db-helper"

type DateRange = { startDate: Date; endDate: Date }
type StringDateRange = { startDate: string; endDate: string }
type Props = {
  items: Item[]
  session: Session
  detailsFilledIn: boolean
} & (
  | { itemsFilledIn: false }
  | {
      itemsFilledIn: true
      selectedItems: number[]
      date: StringDateRange
    }
)

type DateValueType = { startDate: Date | string | null; endDate: Date | string | null } | null

const createDateRange = (startDateString: string, endDateString: string) => ({
  startDate: new Date(startDateString),
  endDate: new Date(endDateString),
})

const previousYear = new Date().getFullYear() - 1
const defaultDateState = createDateRange(`${previousYear}/01/01`, `${previousYear}/12/31`)

const datesEqual = (date1: Date, date2: Date) => date1.getTime() - date2.getTime() === 0
function getDateRangeType({ startDate, endDate }: DateRange): DateRangeType {
  if (datesEqual(startDate, startOfThisYear()) && datesEqual(endDate, endOfThisYear()))
    return DateRangeType.ThisYear
  if (datesEqual(startDate, startOfPreviousYear()) && datesEqual(endDate, endOfPreviousYear()))
    return DateRangeType.LastYear
  return DateRangeType.Custom
}

export default function Items(props: Props) {
  const { items, detailsFilledIn } = props
  const propsDate = props.itemsFilledIn
    ? createDateRange(props.date.startDate, props.date.endDate)
    : null
  const router = useRouter()
  const inputRefs = useRef<HTMLInputElement[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  const [dateRangeState, setDateRangeState] = useState<DateRangeType>(
    props.itemsFilledIn ? getDateRangeType(propsDate as DateRange) : DateRangeType.LastYear
  )
  const dateRangeIsCustom = dateRangeState === DateRangeType.Custom

  const [customDateState, setCustomDateState] = useState(
    props.itemsFilledIn ? (propsDate as DateRange) : defaultDateState
  )
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
      case DateRangeType.AllTime:
        // TODO update before 2049/12/31
        return setCustomDateState({ startDate: utcEpoch(), endDate: new Date("2050/1/1") })
      case DateRangeType.LastYear:
      case DateRangeType.Custom:
      default:
        return setCustomDateState({
          startDate: startOfPreviousYear(),
          endDate: endOfPreviousYear(),
        })
    }
  }

  const checkAll = (_: any) => inputRefs.current.forEach(el => (el.checked = true))
  const unCheckAll = (_: any) => inputRefs.current.forEach(el => (el.checked = false))

  const getItems = () => {
    if (!formRef.current) throw new Error("Form html element has not yet been initialised")

    const formData = new FormData(formRef.current)
    return (formData.getAll("items") as string[]).map(item => parseInt(item))
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()

    const items = getItems()
    const postData: ItemsApiDataType = { items, date: customDateState }
    await postJsonData("/api/items", postData)

    const destination = detailsFilledIn ? "/generate-receipts" : "/details"
    router.push({
      pathname: destination,
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
          Make sure to only choose your QuickBooks sales items which qualify as donations
        </Alert>
        {items.map(({ id, name }) => (
          <Toggle
            key={id}
            id={id}
            label={name}
            defaultChecked={props.itemsFilledIn ? props.selectedItems.includes(id) : true}
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
          value={dateRangeState}
        >
          <option value={DateRangeType.LastYear}>Last year</option>
          <option value={DateRangeType.ThisYear}>This year</option>
          <option value={DateRangeType.Ytd}>This year to date</option>
          <option value={DateRangeType.AllTime}>All time</option>
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
  if (!isSessionQboConnected(session)) return disconnectedRedirect

  const [user, items] = await Promise.all([
    getUserData(session.user.id),
    getItems(session.accessToken, session.realmId),
  ])
  if (!user) throw new Error("User has no corresponding db entry")
  const detailsFilledIn = checkUserDataCompletion(user).doneeDetails

  if (user.date && user.items) {
    const selectedItems = user.items
    const date = {
      startDate: user.date.startDate.toISOString(),
      endDate: user.date.endDate.toISOString(),
    }

    return {
      props: {
        itemsFilledIn: true,
        session,
        items,
        detailsFilledIn,
        selectedItems,
        date,
      },
    }
  }

  return {
    props: {
      itemsFilledIn: false,
      session,
      items,
      detailsFilledIn,
    },
  }
}

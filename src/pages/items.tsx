import { InformationCircleIcon } from "@heroicons/react/24/solid"
import { and, eq } from "drizzle-orm"
import { Alert, Button, Label, Select } from "flowbite-react"
import { GetServerSideProps } from "next"
import { Session, getServerSession } from "next-auth"
import { ApiError } from "next/dist/server/api-utils"
import dynamic from "next/dynamic"
import { useRouter } from "next/router"
import { ChangeEventHandler, FormEventHandler, useMemo, useRef, useState } from "react"

import { Fieldset, Legend, Toggle } from "@/components/form"
import { buttonStyling } from "@/components/link"
import { disconnectedRedirect, signInRedirect } from "@/lib/auth/next-auth-helper-server"
import { refreshTokenIfNeeded } from "@/lib/db/db-helper"
import { db } from "@/lib/db/test"
import { getItems } from "@/lib/qbo-api"
import {
  DateRange,
  DateRangeType,
  createDateRange,
  endOfPreviousYear,
  endOfThisYear,
  startOfPreviousYear,
  startOfThisYear,
  utcEpoch,
} from "@/lib/util/date"
import { SerialiseDates, deSerialiseDates, serialiseDates } from "@/lib/util/nextjs-helper"
import { postJsonData } from "@/lib/util/request"
import { authOptions } from "@/pages/api/auth/[...nextauth]"
import { DataType as ItemsApiDataType } from "@/pages/api/items"
import { Item } from "@/types/qbo-api"
import { accounts, users } from "db/schema"

const DumbDatePicker = () => (
  <div className="relative w-full text-gray-700">
    <input
      type="text"
      className="relative w-full rounded-lg border-gray-300 bg-white py-2.5 pl-4 pr-14 text-sm font-light tracking-wide placeholder-gray-400 transition-all duration-300 focus:border-blue-500 focus:ring focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-white/80"
      value="????-??-?? ~ ????-??-??"
      role="presentation"
      disabled
    />
    <button
      type="button"
      className="absolute right-0 h-full px-3 text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
      disabled
    >
      <svg
        className="h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
)
const DatePicker = dynamic(import("react-tailwindcss-datepicker"), {
  loading: props => <DumbDatePicker />,
})

type Props = {
  items: Item[]
  session: Session
  detailsFilledIn: boolean
  realmId: string
} & (
  | { itemsFilledIn: false }
  | {
      itemsFilledIn: true
      selectedItems: string[]
      dateRange: DateRange
    }
)
type SerialisedProps = SerialiseDates<Props>

type DateValueType = { startDate: Date | string | null; endDate: Date | string | null } | null

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

export default function Items(serialisedProps: SerialisedProps) {
  const props = useMemo(() => deSerialiseDates({ ...serialisedProps }), [serialisedProps])
  const { items, detailsFilledIn, realmId } = props
  const router = useRouter()
  const inputRefs = useRef<HTMLInputElement[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  const [dateRangeState, setDateRangeState] = useState<DateRangeType>(
    props.itemsFilledIn ? getDateRangeType(props.dateRange) : DateRangeType.LastYear,
  )
  const dateRangeIsCustom = dateRangeState === DateRangeType.Custom

  const [customDateState, setCustomDateState] = useState(
    props.itemsFilledIn ? props.dateRange : defaultDateState,
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
    return formData.getAll("items") as string[]
  }

  const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
    event.preventDefault()

    const items = getItems()
    const postData: ItemsApiDataType = { items, dateRange: customDateState, realmId }
    await postJsonData("/api/items", postData)

    const destination = detailsFilledIn ? "/generate-receipts" : "/details"
    await router.push({
      pathname: destination,
      query: `realmId=${realmId}`,
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="m-auto flex w-full max-w-lg flex-col items-center justify-center space-y-4 p-4"
    >
      <Fieldset>
        <Legend className="mb-3">Selected items</Legend>
        <Alert
          color="info"
          className="mb-4"
          icon={() => <InformationCircleIcon className="mr-2 h-6 w-6" />}
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
          <Button onClick={checkAll} color="blue">
            Check All
          </Button>
          <Button onClick={unCheckAll} color="blue">
            Uncheck All
          </Button>
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
          <DatePicker
            value={customDateState}
            onChange={onDateChange}
            disabled={!dateRangeIsCustom}
          />
          {/* <DumbDatePicker
            value={`${formatDateHtmlReverse(customDateState.startDate)} ~ ${formatDateHtmlReverse(
              customDateState.endDate,
            )}`}
          /> */}
        </p>
      </Fieldset>
      <input
        className={buttonStyling + " text-l"}
        type="submit"
        value={detailsFilledIn ? "Generate Receipts" : "Enter Donee Details"}
      />
    </form>
  )
}

// --- server-side props --- //

export const getServerSideProps: GetServerSideProps<SerialisedProps> = async ({
  req,
  res,
  query,
}) => {
  const session = await getServerSession(req, res, authOptions)
  if (!session) return signInRedirect

  const queryRealmId = typeof query.realmid === "string" ? query.realmid : undefined

  const account = await db.query.accounts.findFirst({
    // if the realmId is specified get that account otherwise just get the first account for the user
    where: and(
      eq(accounts.userId, session.user.id),
      queryRealmId ? eq(accounts.realmId, queryRealmId) : eq(accounts.scope, "accounting"),
    ),
    columns: {
      id: true,
      accessToken: true,
      scope: true,
      realmId: true,
      createdAt: true,
      expiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
    },
    with: {
      userData: { columns: { items: true, startDate: true, endDate: true } },
      doneeInfo: { columns: { id: true } },
    },
  })
  if (queryRealmId && !account)
    throw new ApiError(500, "account for given user and company realmId not found in db")
  if (!account || account.scope !== "accounting" || !account.accessToken)
    return disconnectedRedirect

  console.log("account: ", {
    expiresAt: account.expiresAt,
    createdAt: account.createdAt,
    realmId: account.realmId,
  })

  const realmId = queryRealmId ?? account.realmId
  if (!realmId) return disconnectedRedirect

  await refreshTokenIfNeeded(account)
  const items = await getItems(account.accessToken, realmId)
  const detailsFilledIn = Boolean(account.doneeInfo)

  if (!account.userData) {
    const props = {
      itemsFilledIn: false,
      session,
      items,
      detailsFilledIn,
      realmId,
    } satisfies Props
    return {
      props: serialiseDates(props),
    }
  }

  const { userData } = account
  const selectedItems = userData.items ? userData.items.split(",") : []
  const props = {
    itemsFilledIn: true,
    session,
    items,
    detailsFilledIn,
    selectedItems,
    realmId,
    dateRange: { startDate: userData.startDate, endDate: userData.endDate },
  } satisfies Props
  return {
    props: serialiseDates(props),
  }
}

import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useRef, useState } from "react"
import { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import { getServerSession } from "next-auth"

import { CompanyInfo, Item, getCompanyInfo, getItems } from "../lib/qbo-api"
import {
  DateRangeType,
  Session,
  endOfPreviousYearHtml,
  endOfThisYearHtml,
  startOfPreviousYearHtml,
  startOfThisYearHtml,
} from "../lib/util"
import { authOptions } from "./api/auth/[...nextauth]"

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

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <fieldset>
        <legend>Selected items</legend>
        {items.map(({ id, name }) => (
          <div key={id}>
            <input
              ref={el => (el ? inputRefs.current.push(el) : null)}
              type="checkbox"
              name="items"
              value={id}
              id={id.toString()}
              defaultChecked
            />
            <label htmlFor={id.toString()}>{name}</label>
            <br />
          </div>
        ))}
        <button onClick={checkAll}>Check All</button>
        <button onClick={unCheckAll}>Uncheck All</button>
      </fieldset>
      <fieldset>
        <legend>Organisation</legend>
        <p>
          <label htmlFor="companyName">Legal name </label>
          <input
            required
            type="text"
            id="companyName"
            name="companyName"
            defaultValue={companyInfo.name}
          />
        </p>
        <p>
          <label htmlFor="address">Address </label>
          <input
            required
            minLength={10}
            type="text"
            id="address"
            name="address"
            defaultValue={companyInfo.address}
          />
        </p>
        <p>
          <label htmlFor="country">Country </label>
          <input
            required
            minLength={2}
            type="text"
            id="country"
            name="country"
            defaultValue={companyInfo.country}
          />
        </p>
        <p>
          <label htmlFor="registrationNumber">Charity registration number </label>
          <input
            required
            minLength={15}
            type="text"
            id="registrationNumber"
            name="registrationNumber"
            defaultValue="123456789RR0001"
          />
        </p>
        <p>
          <label htmlFor="signatoryName">Signatory&apos;s name </label>
          <input required minLength={5} type="text" id="signatoryName" name="signatoryName" />
        </p>
        <p>
          <label htmlFor="signature">Image of signatory&apos;s signature </label>
          <input required type="text" id="signature" name="signature" />
        </p>
        <p>
          <label htmlFor="smallLogo">Small image of organisation&apos;s logo </label>
          <input required type="text" id="smallLogo" name="smallLogo" />
        </p>
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
        {/* //TODO change this so fields are just disabled when date range isn't custom */}
        {selectedValue === DateRangeType.Custom ? (
          <>
            <p>
              <label htmlFor="dateStart">Start date </label>
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
              <label htmlFor="dateEnd">End date </label>
              <input
                type="date"
                id="dateEnd"
                name="dateRange"
                defaultValue={`${previousYear}-12-31`}
              />
            </p>
          </>
        ) : null}
      </fieldset>
      <input type="submit" value="Submit" />
    </form>
  )
}

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

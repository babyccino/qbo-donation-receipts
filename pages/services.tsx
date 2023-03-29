import { MouseEventHandler, useRef } from "react"
import { useRouter } from "next/router"

import { Item } from "../lib/types"

// const DEBOUNCE = 500

export default function Services({ items }: { items: Item[] }) {
  const inputRefs = useRef<HTMLInputElement[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

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

        router.push({
          pathname: "generate-receipts",
          query: { products: Array.from(formData.keys()) },
        })
      }}
    >
      {items.map(item => (
        <div key={item.Id}>
          <label>
            <input
              ref={el => (el ? inputRefs.current.push(el) : null)}
              type="checkbox"
              name={item.Id}
            />
            {item.Name}
          </label>
          <br />
        </div>
      ))}
      <button onClick={checkAll}>Check All</button>
      <button onClick={unCheckAll}>Uncheck All</button>
      <input type="submit" value="Submit" />
    </form>
  )
}

// --- server-side props ---

import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]"
import { Session } from "../lib/types"

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${session.realmId}/query?query=select * from Item`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/json",
    },
  })
  const items = await response.json()

  if (!response.ok) {
    throw items
  }

  return {
    props: {
      session,
      items: items.QueryResponse.Item,
    },
  }
}

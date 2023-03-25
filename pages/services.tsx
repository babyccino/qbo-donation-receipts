import { FormEventHandler, useRef } from "react"
import { useSession } from "next-auth/react"

import { Item } from "../lib/types"

export default function IndexPage({ items }: { items: Item[] }) {
  const { data: session } = useSession()
  const inputRefs = useRef<HTMLInputElement[]>([])

  // TODO change form to update global state and storage on server onChange without having to click submit
  const onSubmit: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault()
    const formData = new FormData(e.target as any)
    const selectedItems = new Set(formData.keys())
  }

  const checkAll = () => {
    for (const el of inputRefs.current) {
      el.checked = true
    }
  }

  const unCheckAll = () => {
    for (const el of inputRefs.current) {
      el.checked = false
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {items.map(item => (
        <label key={item.Id}>
          <input
            ref={el => (el ? inputRefs.current.push(el) : null)}
            type="checkbox"
            name={item.Name}
          />
          {item.Name}
        </label>
      ))}
      <input type="submit" value="Submit" />
      <button onClick={checkAll}>Check All</button>
      <button onClick={unCheckAll}>Uncheck All</button>
    </form>
  )
}

// --- server-side props ---

import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]"
import { ItemQueryResponse, Session } from "../lib/types"

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

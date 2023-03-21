import Link from "next/link"
import { useSession } from "next-auth/react"

import { Item } from "../lib/util"

export default function IndexPage({ items }: { items: Item[] }) {
  const { data: session } = useSession()

  return (
    <ul>
      {items.map(item => (
        <li>
          <p>{item.Name}</p>
        </li>
      ))}
    </ul>
  )
}

// --- server-side props ---

import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]"
import { ItemQueryResponse, Session } from "../lib/util"

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${session.realmId}/query?query=select * from Item`

  const items: ItemQueryResponse = await (
    await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/json",
      },
    })
  ).json()

  return {
    props: {
      session,
      items: items.QueryResponse.Item,
    },
  }
}

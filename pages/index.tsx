import Link from "next/link"
import { useSession } from "next-auth/react"

export default function IndexPage() {
  const { data: session } = useSession()

  return <Link href="/services">Select products/services</Link>
}

// --- server-side props ---

import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]"
import { Session } from "../lib/util"

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  return {
    props: {
      session,
    },
  }
}

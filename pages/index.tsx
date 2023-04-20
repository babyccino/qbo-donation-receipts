import Link from "next/link"
import { GetServerSidePropsContext } from "next"
import { getServerSession } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"
import { Session } from "../lib/util"

export default function IndexPage() {
  return (
    <>
      <div>
        <Link href="/services">Select products/services</Link>
      </div>
      <div>
        <Link href="/generate-receipt">Generate receipts</Link>
      </div>
    </>
  )
}

// --- server-side props ---

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  return {
    props: {
      session,
    },
  }
}

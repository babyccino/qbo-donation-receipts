import Link from "next/link"
import { GetServerSideProps } from "next"
import { getServerSession } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"
import { Session } from "../lib/util"

type Props = { session: Session }

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

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const session: Session = (await getServerSession(context.req, context.res, authOptions)) as any

  return {
    props: {
      session,
    },
  }
}

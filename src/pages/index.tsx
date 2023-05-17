import Link from "next/link"
import { GetServerSideProps } from "next"
import { getServerSession, Session } from "next-auth"

import { authOptions } from "./api/auth/[...nextauth]"

type Props = { session: Session | null }

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
  const session = await getServerSession(context.req, context.res, authOptions)

  return {
    props: {
      session,
    },
  }
}

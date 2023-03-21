import { GetServerSidePropsContext } from "next"
import { getServerSession, Session } from "next-auth"
import { signIn, useSession } from "next-auth/react"

import Layout from "../components/layout"
import { authOptions } from "./api/auth/[...nextauth]"

export default function IndexPage() {
  const { data: session } = useSession()

  if (!session)
    return (
      <>
        <span>You are not signed in</span>
        <a
          href={`/api/auth/signin`}
          onClick={e => {
            e.preventDefault()
            signIn()
          }}
        >
          Sign in
        </a>
      </>
    )

  return (
    <Layout session={session}>
      <h1>NextAuth.js Example</h1>
      <p>
        This is an example site to demonstrate how to use&nbsp;
        <a href="https://next-auth.js.org">NextAuth.js</a> for authentication.
      </p>
    </Layout>
  )
}

// --- server-side props ---

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      session: await getServerSession(context.req, context.res, authOptions),
    },
  }
}

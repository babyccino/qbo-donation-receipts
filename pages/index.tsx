import { GetServerSidePropsContext } from "next"
import { getServerSession, Session } from "next-auth"

import Layout from "../components/layout"
import { authOptions } from "./api/auth/[...nextauth]"

export default function IndexPage({ session }: { session: Session }) {
  return (
    <Layout session={session}>
      <h1>NextAuth.js Example</h1>
      <p>
        This is an example site to demonstrate how to use{" "}
        <a href="https://next-auth.js.org">NextAuth.js</a> for authentication.
      </p>
    </Layout>
  )
}

// --- server-side props ---

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: any = await getServerSession(context.req, context.res, authOptions)

  console.log("server props session: ", session)

  if (!session) return { props: { session: null } }

  if (!session.user) session.user = null

  if (!session.user.name) session.user.name = null
  if (!session.user.email) session.user.email = null
  if (!session.user.image) session.user.image = null

  return {
    props: {
      session,
    },
  }
}

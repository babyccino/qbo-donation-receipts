import { getServerSession } from "next-auth/next"
import type { Session } from "next-auth"

import Layout from "../components/layout"

export default function ServerSidePage({ session }: { session: Session }) {
  return (
    <Layout session={session}>
      <h1>Server Side Rendering</h1>
      <p>
        This page uses the <strong>getServerSession()</strong> method in{" "}
        <strong>getServerSideProps()</strong>.
      </p>
      <p>
        Using <strong>getServerSession()</strong> in <strong>getServerSideProps()</strong> is the
        recommended approach if you need to support Server Side Rendering with authentication.
      </p>
      <p>
        The advantage of Server Side Rendering is this page does not require client side JavaScript.
      </p>
      <p>The disadvantage of Server Side Rendering is that this page is slower to render.</p>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </Layout>
  )
}

// --- server-side props ---

import type { GetServerSidePropsContext } from "next"

import { authOptions } from "./api/auth/[...nextauth]"

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session: any = await getServerSession(context.req, context.res, authOptions)

  // if (!session) return

  // if (!session.user) session.user = null

  // if (!session.user.name) session.user.name = null
  // if (!session.user.email) session.user.email = null
  // if (!session.user.image) session.user.image = null

  return {
    props: {
      session,
    },
  }
}

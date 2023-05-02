import "./globals.scss"

import { SessionProvider } from "next-auth/react"
import { AppProps } from "next/app"
import { Session } from "next-auth"

import Layout from "@/components/layout"

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <SessionProvider session={session}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </SessionProvider>
  )
}

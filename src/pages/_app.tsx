import "./globals.scss"

import { SessionProvider } from "next-auth/react"
import { AppProps } from "next/app"
import { Session } from "next-auth"
import { NextSeo } from "next-seo"

import Layout from "@/components/layout"
import Head from "next/head"

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <>
      <NextSeo
        title="DonationReceipt.Online"
        description="Expedite your organisation's year-end!"
        openGraph={{
          url: "https://www.donationreceipt.online",
          images: [
            {
              url: "/open-graph.jpg",
              width: 800,
              height: 600,
              alt: "DonationReceipt.Online homepage",
              type: "image/jpeg",
            },
          ],
        }}
        twitter={{
          cardType: "summary_large_image",
        }}
      />
      <Head>
        <title>DonationReceipt.Online</title>
        <meta name="description" content="Expedite your organisation's year-end!" />
      </Head>
      <SessionProvider session={session}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </SessionProvider>
    </>
  )
}

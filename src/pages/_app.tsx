/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import "./globals.scss"

import { SessionProvider } from "next-auth/react"
import { AppProps } from "next/app"
import Head from "next/head"
import { Session } from "next-auth"
import { NextSeo } from "next-seo"

import Layout from "@/components/layout"
import ErrorBoundary from "@/components/error"
import { config } from "@/lib/util/config"

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  const pageTitle =
    config.nodeEnv === "development" || config.nodeEnv === "test"
      ? "[dev] DonationReceipt.Online"
      : "DonationReceipt.Online"
  return (
    <>
      <NextSeo
        title={pageTitle}
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
        <ErrorBoundary>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </ErrorBoundary>
      </SessionProvider>
    </>
  )
}

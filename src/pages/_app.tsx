/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import "./globals.scss"

import { NextSeo } from "next-seo"
import { AppProps } from "next/app"
import Head from "next/head"

import ErrorBoundary from "@/components/error"
import Layout, { LayoutProps } from "@/components/layout"
import { config } from "@/lib/util/config"

export default function App({ Component, pageProps }: AppProps<LayoutProps & Record<string, any>>) {
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
              url: "/open-graph.webp",
              width: 800,
              height: 600,
              alt: "DonationReceipt.Online homepage",
              type: "image/webp",
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
      <ErrorBoundary>
        <Layout
          session={pageProps.session}
          companies={pageProps.companies}
          selectedAccountId={pageProps.selectedAccountId}
        >
          <Component {...pageProps} />
        </Layout>
      </ErrorBoundary>
    </>
  )
}

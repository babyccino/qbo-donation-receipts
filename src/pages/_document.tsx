import Document, { Html, Head, Main, NextScript } from "next/document"

export default class MyDocument extends Document {
  render() {
    const pageProps = this.props?.__NEXT_DATA__?.props?.pageProps
    return (
      <Html>
        <Head />
        <body className="dark:bg-gray-900 max-w-3xl my-0 mx-auto">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

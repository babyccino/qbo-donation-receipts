import type { ReactNode } from "react"
import { Session } from "next-auth"

import Header from "./header"
import Footer from "./footer"

export default function Layout({ children, session }: { children: ReactNode; session: Session }) {
  return (
    <>
      <Header session={session} />
      <main>{children}</main>
      <Footer />
    </>
  )
}

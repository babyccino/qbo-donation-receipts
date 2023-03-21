import type { ReactNode } from "react"
import Link from "next/link"
import { Session } from "next-auth"
import { signOut } from "next-auth/react"

export default function Layout({ children, session }: { children: ReactNode; session: Session }) {
  if (!session.user) return null

  return (
    <>
      <header>
        <div>
          <p>
            {session.user.image && (
              <span style={{ backgroundImage: `url('${session.user.image}')` }} />
            )}
            <span>
              <small>Signed in as</small>
              <br />
              <strong>{session.user.email ?? session.user.name}</strong>
            </span>

            <a
              href={`/api/auth/signout`}
              onClick={e => {
                e.preventDefault()
                signOut()
              }}
            >
              Sign out
            </a>
          </p>
        </div>
        <nav>
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>{children}</main>
    </>
  )
}

import Link from "next/link"
import { signIn, signOut } from "next-auth/react"
import { Session } from "next-auth"

export default function Header({ session }: { session: Session }) {
  return (
    <header>
      {/* <noscript>
        <style>{`.nojs-show { opacity: 1; top: 0; }`}</style>
      </noscript> */}
      <div>
        <p>
          {!session && (
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
          )}
          {session?.user && (
            <>
              {session.user.image && (
                <span style={{ backgroundImage: `url('${session.user.image}')` }} />
              )}
              <span>
                <small>Signed in as</small>
                <br />
                <strong>{session.user.email ?? session.user.name}</strong>
              </span>
            </>
          )}

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
  )
}

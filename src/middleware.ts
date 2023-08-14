import { withAuth } from "next-auth/middleware"

// TODO write custom middleware so signed in users can be redirected from signin page and that page can be made static
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: [
    "/api/stripe/create-checkout-session",
    "/api/details",
    "/api/items",
    "/api/receipts",
    "/details",
    "/generate-receipts",
    "/items",
    "/account",
    "/email",
  ],
}

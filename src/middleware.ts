import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: [
    "/api/stripe/create-checkout-session",
    "/api/details",
    "/api/services",
    "/api/receipts",
    "/details",
    "/generate-receipts",
    "/services",
  ],
}

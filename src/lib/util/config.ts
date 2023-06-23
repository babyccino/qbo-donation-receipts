const getNonVitalEnvironmentVariable = (environmentVariable: string) =>
  process.env[environmentVariable]
function getVitalEnvironmentVariable(environmentVariable: string): string {
  // NextJs code splitting is hot garb
  if (typeof window !== "undefined") return ""

  const unvalidatedEnvironmentVariable = process.env[environmentVariable]
  if (!unvalidatedEnvironmentVariable) {
    console.error("process.env: ", process.env)
    throw new Error(`Couldn't find vital environment variable: ${environmentVariable}`)
  } else {
    return unvalidatedEnvironmentVariable
  }
}

export const config = {
  nextAuthJwtSecret: getVitalEnvironmentVariable("NEXTAUTH_JWT_SECRET"),
  nextAuthSecret: getVitalEnvironmentVariable("NEXTAUTH_SECRET"),
  nextauthQboAuthProviderId: getVitalEnvironmentVariable("NEXTAUTH_QBO_AUTH_PROVIDER_ID"),

  qboClientId: getVitalEnvironmentVariable("QBO_CLIENT_ID"),
  qboClientSecret: getVitalEnvironmentVariable("QBO_CLIENT_SECRET"),
  qboWellKnown: getVitalEnvironmentVariable("QBO_WELL_KNOWN"),
  qboBaseApiRoute: getVitalEnvironmentVariable("QBO_BASE_API_ROUTE"),
  qboOauthRoute: getVitalEnvironmentVariable("QBO_OAUTH_ROUTE"),
  qboAccountsBaseRoute: getVitalEnvironmentVariable("QBO_ACCOUNTS_BASE_ROUTE"),
  qboOauthRevocationEndpoint: getVitalEnvironmentVariable("QBO_OAUTH_REVOCATION_ENDPOINT"),

  stripePublicKey: getVitalEnvironmentVariable("STRIPE_PUBLIC_KEY"),
  stripePrivateKey: getVitalEnvironmentVariable("STRIPE_PRIVATE_KEY"),
  stripeWebhookSecret: getVitalEnvironmentVariable("STRIPE_WEBHOOK_SECRET"),
  stripeSubscribePriceId: getVitalEnvironmentVariable("STRIPE_SUBSCRIBE_PRICE_ID"),

  firebaseProjectId: getVitalEnvironmentVariable("FIREBASE_PROJECT_ID"),
  firebaseClientEmail: getVitalEnvironmentVariable("FIREBASE_CLIENT_EMAIL"),
  firebasePrivateKey: getVitalEnvironmentVariable("FIREBASE_PRIVATE_KEY"),

  firebaseApiKey: getNonVitalEnvironmentVariable("FIREBASE_API_KEY"),
  firebaseMessagingSenderId: getNonVitalEnvironmentVariable("FIREBASE_MESSAGING_SENDER_ID"),
  firebaseAppId: getNonVitalEnvironmentVariable("FIREBASE_APP_ID"),
  firebaseMeasurementId: getNonVitalEnvironmentVariable("FIREBASE_MEASUREMENT_ID"),

  awsAccessKeyId: getVitalEnvironmentVariable("AWS_ACCESS_KEY_ID"),
  awsSecretAccessKey: getVitalEnvironmentVariable("AWS_SECRET_ACCESS_KEY"),

  nextPublicVercelUrl: getNonVitalEnvironmentVariable("NEXT_PUBLIC_VERCEL_URL"),

  testEmail: getNonVitalEnvironmentVariable("TEST_EMAIL"),

  nodeEnv: getNonVitalEnvironmentVariable("NODE_ENV"),
}

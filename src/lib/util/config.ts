import { snakeToCamel, SnakeToCamelCase } from "@/lib/util/etc"

const getNonVitalEnvVariable = (environmentVariable: string) => process.env[environmentVariable]
function getVitalEnvVariable(environmentVariable: string): string {
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

type ConfigInput = Record<string, boolean>
type Config<T extends ConfigInput> = {
  [K in keyof T as SnakeToCamelCase<K & string>]: T[K] extends true ? string : string | undefined
}
function getConfig<T extends ConfigInput>(conf: T): Config<T> {
  const keys = Object.keys(conf)
  const ret = {} as any
  for (const key of keys) {
    const val = conf[key as keyof T]
    const camelCaseKey = snakeToCamel(key)
    ret[camelCaseKey] = val ? getVitalEnvVariable(key) : getNonVitalEnvVariable(key)
  }
  return ret
}

const vital = true as const
const nonVital = false as const
export const config = getConfig({
  NEXTAUTH_JWT_SECRET: vital,
  NEXTAUTH_SECRET: vital,
  NEXTAUTH_QBO_AUTH_PROVIDER_ID: vital,

  QBO_CLIENT_ID: vital,
  QBO_CLIENT_SECRET: vital,
  QBO_WELL_KNOWN: vital,
  QBO_BASE_API_ROUTE: vital,
  QBO_OAUTH_ROUTE: vital,
  QBO_ACCOUNTS_BASE_ROUTE: vital,
  QBO_OAUTH_REVOCATION_ENDPOINT: vital,

  STRIPE_PUBLIC_KEY: vital,
  STRIPE_PRIVATE_KEY: vital,
  STRIPE_WEBHOOK_SECRET: vital,
  STRIPE_SUBSCRIBE_PRICE_ID: vital,

  FIREBASE_PROJECT_ID: vital,
  FIREBASE_CLIENT_EMAIL: vital,
  FIREBASE_PRIVATE_KEY: vital,

  FIREBASE_API_KEY: nonVital,
  FIREBASE_MESSAGING_SENDER_ID: nonVital,
  FIREBASE_APP_ID: nonVital,
  FIREBASE_MEASUREMENT_ID: nonVital,

  FIREBASE_STORAGE_EMULATOR_HOST: nonVital,

  AWS_ACCESS_KEY_ID: vital,
  AWS_SECRET_ACCESS_KEY: vital,

  VERCEL_ENV: nonVital,
  VERCEL_URL: nonVital,
  VERCEL_BRANCH_URL: nonVital,
  NEXT_PUBLIC_VERCEL_URL: nonVital,
  PRODUCTION_URL: nonVital,

  TEST_EMAIL: nonVital,

  NODE_ENV: nonVital,
})

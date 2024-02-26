import { snakeToCamel, SnakeToCamelCase } from "@/lib/util/etc"

const getNonVitalEnvVariable = (environmentVariable: string) => process.env[environmentVariable]
function getVitalEnvVariable(environmentVariable: string): string {
  // NextJs code splitting is hot garb
  if (typeof window !== "undefined") return ""

  const unvalidatedEnvironmentVariable = process.env[environmentVariable]
  if (!unvalidatedEnvironmentVariable) {
    if (process.env.NODE_ENV === "test") {
      console.warn(
        `Couldn't find vital environment variable: ${environmentVariable}. The value 'test val' will be used instead.`,
      )
      return "test val"
    }
    console.error("process.env: ", process.env)
    throw new Error(`Couldn't find vital environment variable: ${environmentVariable}`)
  } else {
    return unvalidatedEnvironmentVariable
  }
}

type EnvList = readonly string[]
type StringsToObj<T extends EnvList | undefined> = T extends EnvList
  ? { [K in T[number] as SnakeToCamelCase<K>]: string }
  : undefined
type StringsToObjPartial<T extends EnvList | undefined> = T extends EnvList
  ? { [K in T[number] as SnakeToCamelCase<K>]?: string }
  : undefined
type Props = {
  vitalKeys?: EnvList
  nonVitalKeys?: EnvList
}
type Config<T extends Props> = StringsToObj<T["vitalKeys"]> & StringsToObjPartial<T["nonVitalKeys"]>
function getConfig<TProps extends Props>({ vitalKeys, nonVitalKeys }: TProps): Config<TProps> {
  const ret = {} as any
  vitalKeys?.forEach(key => {
    const camelCaseKey = snakeToCamel(key)
    ret[camelCaseKey] = getVitalEnvVariable(key)
  })
  nonVitalKeys?.forEach(key => {
    const camelCaseKey = snakeToCamel(key)
    ret[camelCaseKey] = getNonVitalEnvVariable(key)
  })
  return ret
}

const vitalKeys = [
  "NEXTAUTH_JWT_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_QBO_AUTH_PROVIDER_ID",
  "QBO_CLIENT_ID",
  "QBO_CLIENT_SECRET",
  "QBO_WELL_KNOWN",
  "QBO_BASE_API_ROUTE",
  "QBO_OAUTH_ROUTE",
  "QBO_ACCOUNTS_BASE_ROUTE",
  "QBO_OAUTH_REVOCATION_ENDPOINT",
  "STRIPE_PUBLIC_KEY",
  "STRIPE_PRIVATE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SUBSCRIBE_PRICE_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "DOMAIN",
  "LIB_SQL_DB_URL",
  "LIB_SQL_AUTH_TOKEN",
  "EMAIL_WORKER_URL",
  "EMAIL_WORKER_API_KEY",
] as const
const nonVitalKeys = [
  "FIREBASE_API_KEY",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
  "FIREBASE_MEASUREMENT_ID",
  "FIREBASE_STORAGE_EMULATOR_HOST",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "PRODUCTION_URL",
  "TEST_EMAIL",
  "NODE_ENV",
] as const
export const config = getConfig({ vitalKeys, nonVitalKeys })

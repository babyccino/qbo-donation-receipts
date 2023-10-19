export type DeepPartial<T> = T extends object
  ? T extends Date
    ? T
    : {
        [P in keyof T]?: DeepPartial<T[P]>
      }
  : T

export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>

export type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${Lowercase<T>}${Capitalize<SnakeToCamelCase<U>>}`
  : Lowercase<S>
type SnakeToCamelCaseNested<T> = T extends object
  ? {
      [K in keyof T as SnakeToCamelCase<K & string>]: SnakeToCamelCaseNested<T[K]>
    }
  : T

export const snakeToCamel = (str: string) =>
  str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

export function snakeKeysToCamel<T extends object>(obj: T) {
  const keys = Object.keys(obj) as (keyof T)[]
  return keys.reduce<any>((result, key) => {
    const camelKey = snakeToCamel(key as string)
    const nested = obj[key]

    if (typeof obj === "object") result[camelKey] = snakeKeysToCamel(nested as object)
    else result[camelKey] = nested

    return result
  }, {}) as SnakeToCamelCaseNested<T>
}

export const wait = (secs: number) => new Promise<void>(res => setTimeout(res, secs))

export const rand = (min: number, max: number) => Math.random() * (max - min) + min
const { floor } = Math
export const randInt = (min: number, max: number) => floor(rand(min, max))

export const regularCharactersRegex = "^[a-zA-Z0-9-_,\\s]+$"
export const charityRegistrationNumberRegex = "^\\d{9}[A-Z]{2}\\d{4}$"

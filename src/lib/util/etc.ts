export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${Lowercase<T>}${Capitalize<SnakeToCamelCase<U>>}`
  : S
type SnakeToCamelCaseNested<T> = T extends object
  ? {
      [K in keyof T as SnakeToCamelCase<K & string>]: SnakeToCamelCaseNested<T[K]>
    }
  : T

const snakeToCamel = (str: string) => str.replace(/([-_]\w)/g, match => match[1].toUpperCase())
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

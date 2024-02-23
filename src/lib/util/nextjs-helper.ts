import { GetServerSideProps } from "next"
import nextDynamic, { DynamicOptions, Loader } from "next/dynamic"
import { ComponentType, Fragment, ReactNode } from "react"

export const serialisedDateKey = "__serialised_date__"
export type SerialisedDate = { [serialisedDateKey]: number }
export type SerialiseDates<T> = T extends Date
  ? SerialisedDate
  : T extends object
    ? {
        [K in keyof T]: SerialiseDates<T[K]>
      }
    : T
const serialiseDate = (date: Date): SerialisedDate => ({ [serialisedDateKey]: date.getTime() })
export function serialiseDates<T>(obj: T): SerialiseDates<T> {
  if (obj === null) return null as SerialiseDates<T>
  if (obj === undefined) return undefined as SerialiseDates<T>

  if (typeof obj !== "object") return obj as SerialiseDates<T>

  if (obj instanceof Date) return serialiseDate(obj) as SerialiseDates<T>

  if (Array.isArray(obj)) return obj.map(val => serialiseDates(val)) as SerialiseDates<T>

  for (const key in obj) {
    obj[key] = serialiseDates(obj[key]) as any
  }
  return obj as SerialiseDates<T>
}

export type DeSerialiseDates<T> = T extends SerialisedDate
  ? Date
  : T extends object
    ? {
        [K in keyof T]: DeSerialiseDates<T[K]>
      }
    : T
const deSerialiseDate = (serialisedDate: SerialisedDate) =>
  new Date(serialisedDate[serialisedDateKey])
export function deSerialiseDates<T>(obj: T): DeSerialiseDates<T> {
  if (obj === null) return null as DeSerialiseDates<T>
  if (obj === undefined) return undefined as DeSerialiseDates<T>

  if (typeof obj !== "object") return obj as DeSerialiseDates<T>

  if ((obj as any)[serialisedDateKey] !== undefined)
    return deSerialiseDate(obj as unknown as SerialisedDate) as DeSerialiseDates<T>

  if (Array.isArray(obj)) return obj.map(val => deSerialiseDates(val)) as DeSerialiseDates<T>

  const newObj: any = {}
  for (const key in obj) {
    newObj[key] = deSerialiseDates(obj[key]) as any
  }
  return newObj as DeSerialiseDates<T>
}

const isServerSide = typeof window === "undefined"

// add an option to next/dynamic to immediately start loading a component even if it is not in view
export function dynamic<P = {}>(
  loader: Loader<P>,
  options: DynamicOptions<P> & { loadImmediately?: boolean },
): ComponentType<P> {
  if (!options.ssr && options.loadImmediately && typeof loader === "function" && !isServerSide) {
    const loading = loader()
    return nextDynamic(loading, { ...options })
  }
  return nextDynamic(loader, { ...options })
}

export const fragment = (children: ReactNode) => Fragment({ children })

export function interceptGetServerSideProps<T extends GetServerSideProps<any>>(
  getServerSideProps: T,
) {
  return async (ctx: any) => {
    try {
      return await getServerSideProps(ctx)
    } catch (error: any) {
      console.error("Error in getServerSideProps: ", error)
      const serialisedError: any = {}
      if (error.message) serialisedError.message = error.message
      if (error.stack) serialisedError.stack = error.stack
      if (error.statusCod) serialisedError.statusCod = error.statusCod
      return { props: { error: serialisedError } }
    }
  }
}

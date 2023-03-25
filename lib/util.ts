export const base64Encode = (str: string) => Buffer.from(str).toString("base64")

export const formatDate = (date: Date) =>
  `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`

export function multipleClasses(...args: (string | undefined)[]): string {
  return args.reduce((prev, curr): string | undefined => {
    return curr === undefined || curr === "" ? prev : `${prev} ${curr}`
  }) as string
}

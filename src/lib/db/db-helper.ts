export type RemoveTimestamps<T extends { createdAt: Date; updatedAt: Date }> = Omit<
  T,
  "createdAt" | "updatedAt"
>

export function removeTimestamps<T extends { createdAt: Date; updatedAt: Date }>(
  obj: T,
): RemoveTimestamps<T> {
  // @ts-ignore
  delete obj.createdAt
  // @ts-ignore
  delete obj.updatedAt
  return obj
}

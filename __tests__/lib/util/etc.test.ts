import { multipleClasses } from "@/lib/util/etc"

describe("multipleClasses", () => {
  it("combines multiple class names into a single string", () => {
    expect(multipleClasses("foo", "bar", undefined, "", "baz")).toEqual("foo bar baz")
    expect(multipleClasses(undefined, "bar", "", "baz")).toEqual("bar baz")
  })
})

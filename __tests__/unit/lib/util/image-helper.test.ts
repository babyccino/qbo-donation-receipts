import { test, describe, expect } from "bun:test"

import { base64EncodeString, isJpegOrPngDataURL } from "@/lib/util/image-helper"

describe("base64EncodeString", () => {
  test("encodes a string to base64", () => {
    expect(base64EncodeString("hello world")).toEqual("aGVsbG8gd29ybGQ=")
    expect(base64EncodeString("foo bar baz")).toEqual("Zm9vIGJhciBiYXo=")
  })
})

describe("isJpegOrPngDataURL", () => {
  test("should return true for a valid JPEG data URL", () => {
    const dataURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD"
    expect(isJpegOrPngDataURL(dataURL)).toBe(true)
  })

  test("should return true for a valid PNG data URL", () => {
    const dataURL = "data:image/png;base64,iVBORw0KGg"
    expect(isJpegOrPngDataURL(dataURL)).toBe(true)
  })

  test("should return false for an invalid data URL", () => {
    const dataURL = "data:image/gif;base64,R0lGODlhAQ"
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })

  test("should return false for a non-base64 data URL", () => {
    const dataURL = "data:image/jpeg;url=https://example.com/image.jpg"
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })

  test("should return false for a non-JPEG/PNG data URL", () => {
    const dataURL = "data:image/gif;base64,R0lGODlhAQ..."
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })

  describe("real files", () => {
    test("valid jpeg file should return true", async () => {})
  })
})

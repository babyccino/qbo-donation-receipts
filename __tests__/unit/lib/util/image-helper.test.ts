import { test, describe, expect } from "bun:test"
import { blobToBase64 } from "file64"

import { base64EncodeString, isJpegOrPngDataURL } from "@/lib/util/image-helper"

describe("base64EncodeString", () => {
  test("encodes a string to base64", () => {
    expect(base64EncodeString("hello world")).toEqual("aGVsbG8gd29ybGQ=")
    expect(base64EncodeString("foo bar baz")).toEqual("Zm9vIGJhciBiYXo=")
  })
})

describe("isJpegOrPngDataURL", () => {
  describe("strings", () => {
    test("should return true for a valid JPEG data URL", () => {
      const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD"
      expect(isJpegOrPngDataURL(dataUrl)).toBe(true)
    })

    test("should return true for a valid PNG data URL", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGg"
      expect(isJpegOrPngDataURL(dataUrl)).toBe(true)
    })

    test("should return false for an invalid data URL", () => {
      const dataUrl = "data:image/tif;base64,R0lGODlhAQ"
      expect(isJpegOrPngDataURL(dataUrl)).toBe(false)
    })

    test("should return false for a non-base64 data URL", () => {
      const dataUrl = "data:image/jpeg;url=https://example.com/image.jpg"
      expect(isJpegOrPngDataURL(dataUrl)).toBe(false)
    })

    test("should return false for a non-JPEG/PNG data URL", () => {
      const dataUrl = "data:image/gif;base64,R0lGODlhAQ..."
      expect(isJpegOrPngDataURL(dataUrl)).toBe(false)
    })
  })

  describe("real files", () => {
    test("valid jpeg file should return true", async () => {
      const file = Bun.file("./__tests__/test-files/test.jpeg") as Blob

      const dataUrl = await blobToBase64(file)
      expect(isJpegOrPngDataURL(dataUrl)).toBe(true)
    })

    test("valid jpg file should return true", async () => {
      const file = Bun.file("./__tests__/test-files/test.jpg") as Blob

      const dataUrl = await blobToBase64(file)
      expect(isJpegOrPngDataURL(dataUrl)).toBe(true)
    })

    test("valid png file should return true", async () => {
      const file = Bun.file("./__tests__/test-files/test.png") as Blob

      const dataUrl = await blobToBase64(file)
      expect(isJpegOrPngDataURL(dataUrl)).toBe(true)
    })

    test("valid webp file should return true", async () => {
      const file = Bun.file("./__tests__/test-files/test.webp") as Blob

      const dataUrl = await blobToBase64(file)
      expect(isJpegOrPngDataURL(dataUrl)).toBe(true)
    })

    test("valid gif file should return true", async () => {
      const file = Bun.file("./__tests__/test-files/test.gif") as Blob

      const dataUrl = await blobToBase64(file)
      expect(isJpegOrPngDataURL(dataUrl)).toBe(true)
    })

    test("invalid tif file should return true", async () => {
      const file = Bun.file("./__tests__/test-files/test.tif") as Blob

      const dataUrl = await blobToBase64(file)
      expect(isJpegOrPngDataURL(dataUrl)).toBe(false)
    })
  })
})

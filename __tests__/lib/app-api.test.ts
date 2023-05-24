import { alreadyFilledIn, base64EncodeString, isJpegOrPngDataURL } from "@/lib/app-api"
import { DbUser } from "@/lib/db"

describe("base64EncodeString", () => {
  it("encodes a string to base64", () => {
    expect(base64EncodeString("hello world")).toEqual("aGVsbG8gd29ybGQ=")
    expect(base64EncodeString("foo bar baz")).toEqual("Zm9vIGJhciBiYXo=")
  })
})

describe("isJpegOrPngDataURL", () => {
  it("should return true for a valid JPEG data URL", () => {
    const dataURL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD"
    expect(isJpegOrPngDataURL(dataURL)).toBe(true)
  })

  it("should return true for a valid PNG data URL", () => {
    const dataURL = "data:image/png;base64,iVBORw0KGg"
    expect(isJpegOrPngDataURL(dataURL)).toBe(true)
  })

  it("should return false for an invalid data URL", () => {
    const dataURL = "data:image/gif;base64,R0lGODlhAQ"
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })

  it("should return false for a non-base64 data URL", () => {
    const dataURL = "data:image/jpeg;url=https://example.com/image.jpg"
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })

  it("should return false for a non-JPEG/PNG data URL", () => {
    const dataURL = "data:image/gif;base64,R0lGODlhAQ..."
    expect(isJpegOrPngDataURL(dataURL)).toBe(false)
  })
})

describe("alreadyFilledIn", () => {
  // Mocked document snapshot data
  const docData: DbUser = {
    items: [1],
    date: { startDate: new Date(), endDate: new Date() },
    donee: {
      companyAddress: "123 Main St",
      companyName: "Example Company",
      country: "USA",
      registrationNumber: "123456789",
      signatoryName: "John Doe",
      signature: "base64encodedimage",
      smallLogo: "base64encodedimage",
    },
    email: "example@gmail.com",
    id: "1",
    name: "John Smith",
    realmId: "1",
  }

  const docSnapshot = {
    data: jest.fn(),
  }

  it("should return true for full document data", () => {
    docSnapshot.data.mockReturnValueOnce(docData)

    const result = alreadyFilledIn(docSnapshot as any)

    expect(result.items).toBe(true)
    expect(result.doneeDetails).toBe(true)
  })

  it("should give a correct result for filled document data", () => {
    docSnapshot.data.mockReturnValueOnce({
      items: {},
      donee: docData.donee,
    })

    const result = alreadyFilledIn(docSnapshot as any)

    expect(result.items).toBe(false)
    expect(result.doneeDetails).toBe(true)
  })

  it("should give false for empty document data", () => {
    docSnapshot.data.mockReturnValue(null)

    const result = alreadyFilledIn(docSnapshot as any)

    expect(result.items).toBe(false)
    expect(result.doneeDetails).toBe(false)
  })
})

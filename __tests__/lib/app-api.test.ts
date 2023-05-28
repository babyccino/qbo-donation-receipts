import { alreadyFilledIn } from "@/lib/app-api"
import { User } from "@/types/db"

describe("alreadyFilledIn", () => {
  // Mocked document snapshot data
  const docData: User = {
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

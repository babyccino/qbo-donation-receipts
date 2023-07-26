import { DonationReceiptEmail, EmailProps } from "@/components/receipt"

export const dummyEmailProps: EmailProps = {
  donation: {
    name: "John Doe",
    id: 12345,
    total: 100,
    items: [
      {
        name: "Product 1",
        id: 1,
        total: 50,
      },
      {
        name: "Product 2",
        id: 2,
        total: 50,
      },
    ],
    address: "123 Main St, City, Country",
    email: "test@test.com",
  },
  receiptNo: 98765,
  donee: {
    companyName: "Non-Profit Organization",
    companyAddress: "456 Charity Ave, City, Country",
    country: "Country",
    registrationNumber: "123456789",
    signatoryName: "Jane Smith",
    signature: "/signature.png",
    smallLogo: "/android-chrome-192x192.png",
  },
  currentDate: new Date(),
  donationDate: new Date("2023-05-17"),
  currency: "CAD",
}

const PreviewEmail = () => <DonationReceiptEmail {...dummyEmailProps} />
export default PreviewEmail

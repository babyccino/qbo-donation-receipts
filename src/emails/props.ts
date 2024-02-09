import { EmailProps, WithBodyProps } from "@/types/receipt"

export const dummyEmailProps: EmailProps = {
  donation: {
    name: "John Doe",
    donorId: "12345",
    total: 100,
    items: [
      {
        name: "Product 1",
        id: "1",
        total: 50,
      },
      {
        name: "Product 2",
        id: "2",
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
    signature: "/images/signature.webp",
    smallLogo: "/android-chrome-192x192.png",
    largeLogo: "",
  },
  currentDate: new Date(),
  donationDate: (new Date().getFullYear() - 1).toString(),
  currency: "CAD",
}

const body = `Dear ${dummyEmailProps.donation.name},

We hope this message finds you in good health and high spirits. On behalf of ${
  dummyEmailProps.donee.companyName
}, we would like to extend our heartfelt gratitude for your recent contribution. Your generosity and support play a vital role in our mission to [state the mission or purpose of the organization].

With your continued support, we will be able to [describe how the funds will be utilized or the impact they will make]. Your contribution makes a significant difference in the lives of those we serve, and we are deeply grateful for your commitment to our cause.

We believe that true change is made possible through collective efforts, and your support exemplifies the power of individuals coming together for a common purpose. Together, we are making a positive impact and bringing hope to those in need.

Once again, we express our sincerest appreciation for your contribution. It is donors like you who inspire us to continue our work and strive for greater achievements. We are honored to have you as part of our compassionate community.

If you have any questions or would like further information about our organization and how your donation is being utilized, please feel free to reach out to us. We value your feedback and involvement.

Thank you once again for your generosity, compassion, and belief in our mission.

Attached is your Income Tax Receipt for the ${new Date().getFullYear()} taxation year.

With gratitude,`
export const previewEmailProps: WithBodyProps = { ...dummyEmailProps, body }

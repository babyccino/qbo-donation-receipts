import { addBillingAddressesToDonations, CustomerQueryResult } from "../../lib/customer"

describe("addAddressesToCustomerData", () => {
  const donations = [
    {
      name: "John",
      id: 123,
      total: 100,
      products: [
        { name: "Product 1", id: 1, total: 50 },
        { name: "Product 2", id: 2, total: 50 },
      ],
    },
    {
      name: "Jane",
      id: 456,
      total: 200,
      products: [{ name: "Product 3", id: 3, total: 200 }],
    },
  ]

  const customers: CustomerQueryResult = {
    QueryResponse: {
      Customer: [
        {
          Taxable: false,
          Job: false,
          BillWithParent: false,
          Balance: 0,
          BalanceWithJobs: 0,
          CurrencyRef: { value: "USD", name: "United States Dollar" },
          PreferredDeliveryMethod: "Print",
          domain: "QBO",
          sparse: false,
          Id: "123",
          SyncToken: "0",
          MetaData: {
            CreateTime: "2022-03-22T23:53:34-07:00",
            LastUpdatedTime: "2022-03-22T23:53:34-07:00",
          },
          GivenName: "John",
          MiddleName: "",
          FamilyName: "Doe",
          DisplayName: "John Doe",
          FullyQualifiedName: "John Doe",
          PrintOnCheckName: "John Doe",
          Active: true,
          PrimaryEmailAddr: { Address: "johndoe@example.com" },
          BillAddr: {
            Id: "123",
            Line1: "123 Main St",
            City: "San Francisco",
            PostalCode: "94105",
            CountrySubDivisionCode: "CA",
          },
        },
        {
          Taxable: false,
          Job: false,
          BillWithParent: false,
          Balance: 0,
          BalanceWithJobs: 0,
          CurrencyRef: { value: "USD", name: "United States Dollar" },
          PreferredDeliveryMethod: "Print",
          domain: "QBO",
          sparse: false,
          Id: "789",
          SyncToken: "0",
          MetaData: {
            CreateTime: "2022-03-22T23:54:50-07:00",
            LastUpdatedTime: "2022-03-22T23:54:50-07:00",
          },
          GivenName: "Jane",
          MiddleName: "",
          FamilyName: "Smith",
          DisplayName: "Jane Smith",
          FullyQualifiedName: "Jane Smith",
          PrintOnCheckName: "Jane Smith",
          Active: true,
          PrimaryEmailAddr: { Address: "janesmith@example.com" },
        },
      ],
      startPosition: 1,
      maxResults: 2,
    },
    time: "2022-03-23T00:02:43.682-07:00",
  }

  it("should add addresses to each donation object", () => {
    const result = addBillingAddressesToDonations(donations, customers)
    expect(result).toEqual([
      {
        name: "John",
        id: 123,
        total: 100,
        products: [
          { name: "Product 1", id: 1, total: 50 },
          { name: "Product 2", id: 2, total: 50 },
        ],
        address: "123 Main St, San Francisco 94105 CA",
      },
      {
        name: "Jane",
        id: 456,
        total: 200,
        products: [{ name: "Product 3", id: 3, total: 200 }],
        address: "No billing address on file",
      },
    ])
  })
})

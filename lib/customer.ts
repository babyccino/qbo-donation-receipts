import { Donation } from "./customer-sales"

type BillingAddress = {
  Id: string
  Line1: string
  City?: string
  PostalCode?: string
  Lat?: string
  Long?: string
  CountrySubDivisionCode?: string
  Line2?: string
  Line3?: string
}

type Customer = {
  Taxable: boolean
  Job: boolean
  BillWithParent: boolean
  Balance: number
  BalanceWithJobs: number
  CurrencyRef: {
    value: string
    name: string
  }
  PreferredDeliveryMethod: string
  domain: "QBO"
  sparse: boolean
  Id: string
  SyncToken: string
  MetaData: {
    CreateTime: string
    LastUpdatedTime: string
  }
  GivenName: string
  MiddleName: string
  FamilyName: string
  DisplayName: string
  FullyQualifiedName: string
  PrintOnCheckName: string
  Active: boolean
  PrimaryEmailAddr: {
    Address: string
  }
  BillAddr?: BillingAddress
  CompanyName?: string
}

export type CustomerQueryResponse = {
  QueryResponse: {
    Customer: Customer[]
    startPosition: number
    maxResults: number
  }
  time: string
}

export const getAddress = (address: BillingAddress): string =>
  address.Line1 +
  (address.Line2 ? " " + address.Line2 : "") +
  (address.Line3 ? " " + address.Line3 : "") +
  (address.City || address.PostalCode || address.CountrySubDivisionCode ? "," : "") +
  (address.City ? " " + address.City : "") +
  (address.PostalCode ? " " + address.PostalCode : "") +
  (address.CountrySubDivisionCode ? " " + address.CountrySubDivisionCode : "")

export function combineCustomerQueries(...queries: CustomerQueryResponse[]): CustomerQueryResponse {
  const customers = queries.reduce<Customer[]>(
    (prev, curr) => prev.concat(curr.QueryResponse.Customer),
    []
  )
  const total = queries.reduce<number>((prev, curr) => prev + curr.QueryResponse.maxResults, 0)

  return {
    ...queries[0],
    QueryResponse: { ...queries[0].QueryResponse, maxResults: total, Customer: customers },
  }
}

export function addAddressesToCustomerData(
  donations: Omit<Donation, "address">[],
  customers: CustomerQueryResponse
): Donation[] {
  return donations.map<Donation>(donation => {
    const customer = customers.QueryResponse.Customer.find(el => parseInt(el.Id) === donation.id)

    const address = customer?.BillAddr
      ? getAddress(customer.BillAddr)
      : "No billing address on file"

    return { ...donation, address }
  })
}

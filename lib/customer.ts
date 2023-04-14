import { Donation, DonationWithoutAddress } from "./customer-sales"

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

export type CustomerQueryResult = {
  QueryResponse: {
    Customer: Customer[]
    startPosition: number
    maxResults: number
  }
  time: string
}

/**
 * Returns a concatenated string representing the billing address object.
 *
 * @param {BillingAddress} address - The billing address object.
 * @returns {string} - The concatenated string representing the billing address.
 */
export const getAddress = (address: BillingAddress): string =>
  address.Line1 +
  (address.Line2 ? " " + address.Line2 : "") +
  (address.Line3 ? " " + address.Line3 : "") +
  (address.City || address.PostalCode || address.CountrySubDivisionCode ? "," : "") +
  (address.City ? " " + address.City : "") +
  (address.PostalCode ? " " + address.PostalCode : "") +
  (address.CountrySubDivisionCode ? " " + address.CountrySubDivisionCode : "")

/**
 * Combines the customer queries from multiple sources into a single query.
 *
 * @param {...CustomerQueryResponse} queries - The customer query responses to be combined.
 * @returns {CustomerQueryResponse} - A combined customer query response object.
 */
export function combineCustomerQueries(...queries: CustomerQueryResult[]): CustomerQueryResult {
  const customers = queries.flatMap(({ QueryResponse: { Customer } }) => Customer)
  const total = queries.reduce((prev, { QueryResponse }) => prev + QueryResponse.maxResults, 0)

  return {
    ...queries[0],
    QueryResponse: { ...queries[0].QueryResponse, maxResults: total, Customer: customers },
  }
}

/**
 * Adds billing addresses to an array of donation objects by querying the customer data.
 *
 * @param {DonationWithoutAddress[]} donations - An array of donation objects without billing addresses.
 * @param {CustomerQueryResponse} customers - A customer query response object containing customer data.
 * @returns {Donation[]} - An array of donation objects with billing addresses.
 */
export function addBillingAddressesToDonations(
  donations: DonationWithoutAddress[],
  customers: CustomerQueryResult
): Donation[] {
  return donations.map<Donation>(donation => {
    const customer = customers.QueryResponse.Customer.find(el => parseInt(el.Id) === donation.id)

    const address = customer?.BillAddr
      ? getAddress(customer.BillAddr)
      : "No billing address on file"

    return { ...donation, address }
  })
}

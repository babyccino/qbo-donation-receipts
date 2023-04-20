import { GetServerSidePropsContext } from "next"
import { Session, fetchJsonData } from "./util"
import { ParsedUrlQuery } from "querystring"

export type QBOProfile = {
  sub: string
  aud: string[]
  realmid: string
  auth_time: number
  iss: string
  exp: number
  iat: number
}

export type ItemQueryResponseItem = {
  Name: string
  Description: string
  Active: boolean
  FullyQualifiedName: string
  Taxable: boolean
  UnitPrice: number
  Type: string
  IncomeAccountRef: {
    value: string
    name: string
  }
  PurchaseCost: number
  TrackQtyOnHand: boolean
  domain: string
  sparse: boolean
  Id: string
  SyncToken: string
  MetaData: {
    CreateTime: string
    LastUpdatedTime: string
  }
}

export type ItemQueryResponse = {
  QueryResponse: {
    Item: ItemQueryResponseItem[]
    startPosition: number
    maxResults: number
  }
  time: string
}

type Address = {
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
  BillAddr?: Address
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

type ColData = {
  value: string
  id?: string
}

type Option = {
  Name: string
  Value: string
}

type MetaData = {
  Name: string
  Value: string
}

type Row = {
  ColData: ColData[]
}

export type CustomerSalesReport = {
  Header: {
    Time: string
    ReportName: string
    ReportBasis: string
    StartPeriod: string
    EndPeriod: string
    SummarizeColumnsBy: string
    Currency: string
    Option: Option[]
  }
  Columns: {
    Column: {
      ColTitle: string
      ColType: string
      MetaData?: MetaData[]
    }[]
  }
  Rows: {
    Row: (CustomerSalesRow | CustomerSalesSectionRow | CustomerSalesTotalsRow)[]
  }
}

export type CustomerSalesRow = {
  ColData: ColData[]
  type?: undefined
  group?: undefined
}

export type CustomerSalesSectionRow = {
  Header: {
    ColData: ColData[]
  }
  Rows: {
    Row: (Row & { type: "data" })[]
  }
  Summary: Row
  type: "Section"
  group?: undefined
}

// last row is of this shape showing the totals of all the respective items
export type CustomerSalesTotalsRow = {
  Summary: Row
  type: "Section"
  group: "GrandTotal"
}

export type Donation = {
  name: string
  id: number
  total: number
  products: { name: string; id: number; total: number }[]
  address: string
}
export type DonationWithoutAddress = Omit<Donation, "address">

type Item = { name: string; id: number }

type RowData = {
  data: number[]
  id: number
  total: number
  name: string
}

export type CompanyInfoQueryResult = {
  QueryResponse: {
    CompanyInfo: {
      CompanyName: string
      LegalName: string
      CompanyAddr: Address
      CustomerCommunicationAddr: Address
      LegalAddr: Address
      CustomerCommunicationEmailAddr: {
        Address: string
      }
      PrimaryPhone: {}
      CompanyStartDate: string
      FiscalYearStartMonth: string
      Country: string
      Email: {
        Address: string
      }
      WebAddr: {}
      SupportedLanguages: string
      NameValue: {
        Name: string
        Value: string
      }[]
      domain: "QBO"
      sparse: boolean
      Id: string
      SyncToken: string
      MetaData: {
        CreateTime: string
        LastUpdatedTime: string
      }
    }[]
    maxResults: number
  }
  time: string
}

export type CompanyInfo = {
  name: string
  address: string
  country: string
}

/**
 * Returns a concatenated string representing the billing address object.
 *
 * @param {Address} address - The billing address object.
 * @returns {string} - The concatenated string representing the billing address.
 */
export const getAddress = (address: Address): string =>
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

/**
 * Creates a list of donations from a customer sales report.
 * @param {CustomerSalesReport} report - The sales report to process.
 * @param {Set<number>} selectedItemIds - The IDs of the items to include in the donations.
 * @returns {DonationWithoutAddress[]} - The list of donations.
 */
export function createDonationsFromSalesReport(
  report: CustomerSalesReport,
  selectedItemIds: Set<number>
): DonationWithoutAddress[] {
  const allItems = parseItemsFromReport(report)

  const allRows = report.Rows.Row
  const rowsToUse = allRows.filter(row => !row.group && !(row.group === "GrandTotal")) as (
    | CustomerSalesRow
    | CustomerSalesSectionRow
  )[]

  return rowsToUse
    .map<DonationWithoutAddress>(row => createDonationFromRow(row, selectedItemIds, allItems))
    .filter(donation => donation.total !== 0)
}

function createDonationFromRow(
  row: CustomerSalesRow | CustomerSalesSectionRow,
  selectedItemIds: Set<number>,
  allItems: Item[]
): DonationWithoutAddress {
  const { data, id, name } = getRowData(row)

  const products = data
    .map((total, index) => ({ total, ...allItems[index] }))
    .filter(product => product.total > 0 && selectedItemIds.has(product.id))

  const total = products.reduce((sum, product) => sum + product.total, 0)

  return { name, id, total, products }
}

function parseItemsFromReport(report: CustomerSalesReport): Item[] {
  const columns = report.Columns.Column.slice(1, -1)
  return columns.map((column, i) => {
    if (!column.MetaData) throw new Error(`Column ${i} is missing 'MetaData'`)
    const id = parseInt(column.MetaData[0].Value)
    return { name: column.ColTitle, id }
  })
}

function parseColData(col: ColData): number {
  const parsedNum = parseFloat(col.value)
  return parsedNum ? parsedNum : 0
}

function getCustomerSalesSectionRowData(row: CustomerSalesSectionRow): RowData {
  const { Header, Summary } = row
  const customer = Header.ColData[0]
  const rawData = Summary.ColData

  if (!customer.id || !customer.value)
    throw new Error(`Customer section data is malformed, missing id or name\n`, row as any)

  const id = parseInt(customer.id as string)
  const name = customer.value
  const total = parseFloat(rawData.at(-1)!.value)
  const data: number[] = rawData.slice(1, -1).map<number>(parseColData)

  return { data, id, total, name }
}

function getCustomerSalesRowData(row: CustomerSalesRow): RowData {
  const rawData = row.ColData
  const customer = rawData[0]

  if (!customer || customer.id === undefined)
    throw new Error(`Customer data is malformed, missing id or name\n`, row as any)

  const id = parseInt(customer.id)
  const name = customer.value
  const total = parseFloat(rawData.at(-1)!.value)
  const data: number[] = rawData.slice(1, -1).map<number>(parseColData)

  return { data, id, total, name }
}

const getRowData = (row: CustomerSalesRow | CustomerSalesSectionRow): RowData =>
  row.type && row.type === "Section"
    ? getCustomerSalesSectionRowData(row)
    : getCustomerSalesRowData(row)

export function parseCompanyInfo({ QueryResponse }: CompanyInfoQueryResult): CompanyInfo {
  const companyInfo = QueryResponse.CompanyInfo.at(0)
  if (!companyInfo) throw new Error("No company info found")
  const { LegalName, CompanyName, LegalAddr, CompanyAddr, Country } = companyInfo
  return {
    name: LegalName || CompanyName,
    address: LegalAddr ? getAddress(LegalAddr) : getAddress(CompanyAddr),
    country: Country,
  }
}

export const SANDBOX_BASE_API_ROUTE = "https://sandbox-quickbooks.api.intuit.com/v3/company"

export const makeQueryUrl = (realmId: string, query: string) =>
  `${SANDBOX_BASE_API_ROUTE}/${realmId}/query?query=${query}`

function getDates(query: ParsedUrlQuery): [string, string] {
  const { startDate, endDate } = query
  // TODO if date is not in query get from db
  if (!startDate || typeof startDate !== "string" || !endDate || typeof endDate !== "string")
    throw new Error("date data is malformed")
  return [startDate, endDate]
}

export async function getCustomerSalesReport(
  session: Session,
  context: GetServerSidePropsContext
): Promise<CustomerSalesReport> {
  const [startDate, endDate] = getDates(context.query)

  const url = `${SANDBOX_BASE_API_ROUTE}/${session.realmId}/reports/CustomerSales?\
summarize_column_by=ProductsAndServices&start_date=${startDate}&end_date=${endDate}`

  return fetchJsonData<CustomerSalesReport>(url, session.accessToken)
}

export async function getCustomerData(session: Session): Promise<CustomerQueryResult> {
  const url = makeQueryUrl(session.realmId, "select * from Customer MAXRESULTS 1000")

  // TODO may need to do multiple queries if the returned array is 1000, i.e. the query did not contain all customers
  // TODO this should be stored on the server so we don't have to fetch constantly

  return fetchJsonData<CustomerQueryResult>(url, session.accessToken)
}

export async function getItemData(session: Session): Promise<ItemQueryResponse> {
  const url = makeQueryUrl(session.realmId, "select * from Item")
  return fetchJsonData<ItemQueryResponse>(url, session.accessToken)
}

export async function getCompanyData(session: Session): Promise<CompanyInfoQueryResult> {
  const url = makeQueryUrl(session.realmId, "select * from CompanyInfo")
  return fetchJsonData<CompanyInfoQueryResult>(url, session.accessToken)
}

import { Session } from "next-auth"
import { ParsedUrlQuery } from "querystring"

import { formatDateHtmlReverse } from "./util/date"
import { fetchJsonData } from "./util/request"
import { User } from "@/types/db"

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
  Fault: undefined
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
type CustomerSalesReportError = {
  Fault: { Error: QboError[]; type: string }
  time: string
}
type QboError = {
  Message: string
  Detail: string
  code: string
  element: string
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

export type Item = { name: string; id: number }

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
      CompanyAddr?: Address
      CustomerCommunicationAddr: Address
      LegalAddr?: Address
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
  companyName: string
  companyAddress: string
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

const baseApiRoute =
  process.env.NODE_ENV === "test"
    ? "test"
    : process.env.QBO_SANDBOX_BASE_API_ROUTE || process.env.QBO_BASE_API_ROUTE || ""
if (baseApiRoute === "") throw new Error("missing either QBO base api route env variable")

/**
 * Constructs a query URL for a given realm ID and query string.
 * @param {string} realmId - The ID of the realm to query.
 * @param {string} query - The query string to use.
 * @returns {string} The complete query URL.
 */
export const makeQueryUrl = (realmId: string, query: string) =>
  `${baseApiRoute}/${realmId}/query?query=${query}`

/**
 * Extracts start and end date values from a query object.
 * @param {ParsedUrlQuery} query - The query object to extract dates from.
 * @returns {[string, string]} An array containing the start and end dates as strings.
 * @throws {Error} If the date data is malformed.
 */
async function getDates(dbUser: User, query: ParsedUrlQuery): Promise<[string, string]> {
  const { startDate, endDate } = query
  if (startDate && startDate !== "" && endDate && endDate !== "")
    return [startDate as string, endDate as string]

  if (!dbUser || !dbUser.date) throw new Error("Date data not found in query nor database")

  return [formatDateHtmlReverse(dbUser.date.startDate), formatDateHtmlReverse(dbUser.date.endDate)]
}

/**
 * Fetches a customer sales report for a given session and server-side context.
 * @param {Session} session - The session object representing the user's authorization.
 * @param {GetServerSidePropsContext} context - The server-side context object.
 * @returns {Promise<CustomerSalesReport>} A promise resolving to the customer sales report.
 */
export async function getCustomerSalesReport(
  session: Session,
  query: ParsedUrlQuery,
  dbUser: User
) {
  const [startDate, endDate] = await getDates(dbUser, query)

  const url = `${baseApiRoute}/${session.realmId}/reports/CustomerSales?\
summarize_column_by=ProductsAndServices&start_date=${startDate}&end_date=${endDate}`

  return fetchJsonData<CustomerSalesReport | CustomerSalesReportError>(url, session.accessToken)
}

/**
 * Fetches customer data for a given session.
 * @param {Session} session - The session object representing the user's authorization.
 * @returns {Promise<CustomerQueryResult>} A promise resolving to the customer data.
 */
export function getCustomerData(session: Session) {
  const url = makeQueryUrl(session.realmId, "select * from Customer MAXRESULTS 1000")

  // TODO may need to do multiple queries if the returned array is 1000, i.e. the query did not contain all customers
  // TODO this should be stored on the server so we don't have to fetch constantly

  return fetchJsonData<CustomerQueryResult>(url, session.accessToken)
}

/**
 * Fetches item data for a given session.
 * @param {Session} session - The session object representing the user's authorization.
 * @returns {Promise<Item[]>} A promise resolving to an array of item objects.
 */
export async function getItems(session: Session) {
  const url = makeQueryUrl(session.realmId, "select * from Item")
  const itemQueryResponse = await fetchJsonData<ItemQueryResponse>(url, session.accessToken)
  const items = itemQueryResponse.QueryResponse.Item
  return items.map<Item>(({ Id, Name }) => ({ id: parseInt(Id), name: Name }))
}

/**
 * Fetches company information for a given session.
 * @param {Session} session - The session object representing the user's authorization.
 * @returns {Promise<CompanyInfo>} A promise resolving to the company information.
 */
export async function getCompanyInfo(session: Session) {
  const url = makeQueryUrl(session.realmId, "select * from CompanyInfo")
  const companyQueryResult = await fetchJsonData<CompanyInfoQueryResult>(url, session.accessToken)
  return parseCompanyInfo(companyQueryResult)
}

function getValidAddress(
  legalAddress: Address | undefined,
  companyAddress: Address | undefined
): string {
  if (legalAddress) return getAddress(legalAddress)
  if (companyAddress) return getAddress(companyAddress)
  return "No address on file"
}

export function parseCompanyInfo({ QueryResponse }: CompanyInfoQueryResult): CompanyInfo {
  const companyInfo = QueryResponse.CompanyInfo.at(0)
  if (!companyInfo) throw new Error("No company info found")
  const { LegalName, CompanyName, LegalAddr, CompanyAddr, Country } = companyInfo
  return {
    companyName: LegalName || CompanyName,
    companyAddress: getValidAddress(LegalAddr, CompanyAddr),
    country: Country,
  }
}

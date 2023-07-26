import { ApiError } from "next/dist/server/api-utils"

import { formatDateHtmlReverse } from "@/lib/util/date"
import { fetchJsonData } from "@/lib/util/request"
import { config } from "@/lib/util/config"

export type QBOProfile = {
  sub: string
  aud: string[]
  realmid: string
  auth_time: number
  iss: string
  exp: number
  iat: number
}

export type OpenIdUserInfo = {
  sub: string
  givenName: string
  familyName: string
  email: string
  emailVerified: boolean
  phoneNumber: string
  phoneNumberVerified: boolean
  address: {
    streetAddress: string
    locality: string
    region: string
    postalCode: string
    country: string
  }
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
  SubItem?: boolean
  ParentRef?: {
    value: string
    name: string
  }
  Level?: number
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
    Row: CustomerSalesReportRow[]
  }
}
type CustomerSalesReportRow = SalesRow | SalesSectionRow | NotSpecifiedSalesRow | SalesTotalsRow
export type SalesRow = {
  ColData: ColData[]
}
type NotSpecifiedSalesRow = {
  ColData: ColData[]
  group: "**"
}
export type SalesSectionRow = {
  Header: {
    ColData: ColData[]
  }
  Rows: {
    Row: (Row & { type: "data" })[]
  }
  Summary: Row
  type: "Section"
}
// last row is of this shape showing the totals of all the respective items
export type SalesTotalsRow = {
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
  email: string | null
}
export type DonationWithoutAddress = Omit<Donation, "address" | "email">

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

const padIfExists = (str: string | null | undefined) => (str ? ` ${str}` : "")
export const getAddressString = (address: Address): string =>
  address.Line1 +
  padIfExists(address.Line2) +
  padIfExists(address.Line3) +
  (address.City || address.PostalCode || address.CountrySubDivisionCode ? "," : "") +
  padIfExists(address.City) +
  padIfExists(address.PostalCode) +
  padIfExists(address.CountrySubDivisionCode)

export function getAddressArray({
  Line1,
  Line2,
  Line3,
  City,
  CountrySubDivisionCode,
  PostalCode,
}: Address) {
  const ret = [Line1]
  if (Line2) ret.push(Line2)
  if (Line3) ret.push(Line3)
  if (!(City || PostalCode || CountrySubDivisionCode)) return ret
  const line4 = padIfExists(City) + padIfExists(PostalCode) + padIfExists(CountrySubDivisionCode)
  ret.push(line4)
  return ret
}

export function combineCustomerQueries(...queries: CustomerQueryResult[]): CustomerQueryResult {
  const customers = queries.flatMap(({ QueryResponse: { Customer } }) => Customer)
  const total = queries.reduce((prev, { QueryResponse }) => prev + QueryResponse.maxResults, 0)

  return {
    ...queries[0],
    QueryResponse: { ...queries[0].QueryResponse, maxResults: total, Customer: customers },
  }
}

export const addBillingAddressesToDonations = (
  donations: DonationWithoutAddress[],
  customers: CustomerQueryResult
) =>
  donations.map<Donation>(donation => {
    const customer = customers.QueryResponse.Customer.find(el => parseInt(el.Id) === donation.id)

    if (!customer) throw new Error(`Customer not found for donation with id: ${donation.id}`)

    const address = customer.BillAddr
      ? getAddressString(customer.BillAddr)
      : "No billing address on file"

    return { ...donation, address, email: customer.PrimaryEmailAddr?.Address ?? null }
  })

const notGroupedRow = (row: CustomerSalesReportRow): row is SalesRow | SalesSectionRow =>
  !("group" in row)
export function createDonationsFromSalesReport(
  report: CustomerSalesReport,
  selectedItemIds: number[]
): DonationWithoutAddress[] {
  const allItems = parseItemsFromReport(report)

  const allRows = report.Rows.Row
  const rowsToUse = allRows.filter<SalesRow | SalesSectionRow>(notGroupedRow)
  const itemsSet = new Set(selectedItemIds)

  return rowsToUse
    .map<DonationWithoutAddress>(row => createDonationFromRow(row, itemsSet, allItems))
    .filter(donation => donation.total !== 0)
}

function createDonationFromRow(
  row: SalesRow | SalesSectionRow,
  selectedItemIds: Set<number>,
  allItems: Item[]
): DonationWithoutAddress {
  const { data, id, name } = getRowData(row)

  const products = data
    .map((total, index) => ({ total, ...allItems[index] }))
    .filter(({ total, id }) => total > 0 && selectedItemIds.has(id))

  const total = products.reduce((sum, { total }) => sum + total, 0)

  return { name, id, total, products }
}

function skipFirstAndLast<T>(arr: T[]): T[] {
  return arr.slice(1, -1)
}
const parseItemsFromReport = (report: CustomerSalesReport) =>
  skipFirstAndLast(report.Columns.Column).map((column, i) => {
    if (!column.MetaData) throw new Error(`Column ${i} is missing 'MetaData'`)
    const id = parseInt(column.MetaData[0].Value)
    return { name: column.ColTitle, id }
  })

function parseColData(col: ColData): number {
  const parsedNum = parseFloat(col.value)
  return parsedNum ? parsedNum : 0
}

function getCustomerSalesSectionRowData(row: SalesSectionRow): RowData {
  const { Header, Summary } = row
  const customer = Header.ColData[0]
  const rawData = Summary.ColData

  if (!customer.id || !customer.value)
    throw new Error(`Customer section data is malformed, missing id or name\n`, row as any)

  const id = parseInt(customer.id as string)
  const name = customer.value
  const total = parseFloat(rawData.at(-1)!.value)
  const data: number[] = skipFirstAndLast(rawData).map<number>(parseColData)

  return { data, id, total, name }
}

function getCustomerSalesRowData(row: SalesRow): RowData {
  const rawData = row.ColData
  const customer = rawData[0]

  if (!customer || customer.id === undefined)
    throw new Error(`Customer data is malformed, missing id or name\n`, row as any)

  const id = parseInt(customer.id)
  const name = customer.value
  const total = parseFloat(rawData.at(-1)!.value)
  const data = skipFirstAndLast(rawData).map<number>(parseColData)

  return { data, id, total, name }
}

function isSalesSectionRow(row: SalesRow | SalesSectionRow): row is SalesSectionRow {
  return "type" in row && row.type === "Section"
}
const getRowData = (row: SalesRow | SalesSectionRow): RowData =>
  isSalesSectionRow(row) ? getCustomerSalesSectionRowData(row) : getCustomerSalesRowData(row)

const { nodeEnv, qboBaseApiRoute } = config
const baseApiRoute = nodeEnv && nodeEnv === "test" ? "test" : `${qboBaseApiRoute}/company`

export const makeQueryUrl = (realmId: string, query: string) =>
  `${baseApiRoute}/${realmId}/query?query=${query}`

export async function getCustomerSalesReport(
  accessToken: string,
  realmId: string,
  dates: { startDate: Date; endDate: Date }
) {
  const startDate = formatDateHtmlReverse(dates.startDate)
  const endDate = formatDateHtmlReverse(dates.endDate)

  const url = `${baseApiRoute}/${realmId}/reports/CustomerSales?\
summarize_column_by=ProductsAndServices&start_date=${startDate}&end_date=${endDate}`

  const salesReport = await fetchJsonData<CustomerSalesReport | CustomerSalesReportError>(
    url,
    accessToken
  )
  if ("Fault" in salesReport) {
    const err = salesReport.Fault.Error[0]?.Message
    throw new ApiError(
      500,
      "QBO did not return a sales report" + (err ? "\nQBO error: " + err : "")
    )
  }
  return salesReport
}

export function getCustomerData(accessToken: string, realmId: string) {
  const url = makeQueryUrl(realmId, "select * from Customer MAXRESULTS 1000")

  // TODO may need to do multiple queries if the returned array is 1000, i.e. the query did not contain all customers

  return fetchJsonData<CustomerQueryResult>(url, accessToken)
}

export async function getItems(accessToken: string, realmId: string) {
  const url = makeQueryUrl(realmId, "select * from Item")
  const itemQuery = await fetchJsonData<ItemQueryResponse>(url, accessToken)
  return formatItemQuery(itemQuery)
}

export function formatItemQuery(itemQuery: ItemQueryResponse) {
  const items = itemQuery.QueryResponse.Item
  // TODO handle subitems
  return items
    .filter(item => !item.SubItem)
    .map<Item>(({ Id, Name }) => ({ id: parseInt(Id), name: Name }))
}

export async function getCompanyInfo(accessToken: string, realmId: string) {
  const url = makeQueryUrl(realmId, "select * from CompanyInfo")
  const companyQueryResult = await fetchJsonData<CompanyInfoQueryResult>(url, accessToken)
  return parseCompanyInfo(companyQueryResult)
}

function getValidAddress(
  legalAddress: Address | undefined,
  companyAddress: Address | undefined
): string {
  if (legalAddress) return getAddressString(legalAddress)
  if (companyAddress) return getAddressString(companyAddress)
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

export async function getDonations(
  accessToken: string,
  realmId: string,
  dates: { startDate: Date; endDate: Date },
  items: number[]
) {
  const [salesReport, customerQueryResult] = await Promise.all([
    getCustomerSalesReport(accessToken, realmId, dates),
    getCustomerData(accessToken, realmId),
  ])

  const donationDataWithoutAddresses = createDonationsFromSalesReport(salesReport, items)
  return addBillingAddressesToDonations(donationDataWithoutAddresses, customerQueryResult)
}

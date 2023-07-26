import { ApiError } from "next/dist/server/api-utils"

import { formatDateHtmlReverse } from "@/lib/util/date"
import { fetchJsonData } from "@/lib/util/request"
import { config } from "@/lib/util/config"
import {
  ItemQueryResponse,
  Item,
  SalesRow,
  SalesSectionRow,
  Donation,
  DonationWithoutAddress,
  CompanyInfoQueryResult,
  CompanyInfo,
  Address,
  CustomerQueryResult,
  CustomerSalesReport,
  CustomerSalesReportRow,
  CustomerSalesReportError,
  ColData,
  RowData,
} from "@/types/qbo-api"

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

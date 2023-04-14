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

/**
 * Creates a list of donations from a customer sales report.
 * @param {CustomerSalesReport} report - The sales report to process.
 * @param {Set<number>} items - The IDs of the items to include in the donations.
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

type RowData = {
  data: number[]
  id: number
  total: number
  name: string
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

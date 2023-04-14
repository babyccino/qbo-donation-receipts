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

export function createDonationsFromSalesReport(
  report: CustomerSalesReport,
  items: Set<number>
): Omit<Donation, "address">[] {
  const allItems: { name: string; id: number }[] = []

  const columns = report.Columns.Column
  // first column is customer name and last is total
  for (let i = 1; i < columns.length - 1; ++i) {
    const entry = columns[i]
    if (!entry.MetaData) throw new Error(`Column ${i} is missing 'MetaData'`)
    const id = parseInt(entry.MetaData[0].Value)
    allItems.push({ name: entry.ColTitle, id })
  }

  const rows = report.Rows.Row
  const ret: Omit<Donation, "address">[] = []
  for (let i = 0; i < rows.length - 1; ++i) {
    const row = rows[i]
    if (row.group && row.group === "GrandTotal")
      throw new Error("Malformed data, only last column should be total")

    const { data, id, name } = getRowData(row)

    const total = data.reduce<number>(
      (prev, curr, ii) => (items.has(allItems[ii].id) ? curr + prev : prev),
      0
    )

    if (total === 0) continue

    const products = data.reduce<
      {
        name: string
        id: number
        total: number
      }[]
    >((prev, curr, ii) => {
      // if total for item is 0 or if the item is not in the list of items we are using...
      // do not add the data point to the list
      const correspondingItem = allItems[ii]
      if (!curr || !items.has(correspondingItem.id)) return prev
      else return [...prev, { ...correspondingItem, total: data[ii] }]
    }, [])

    ret.push({ name, id, total, products })
  }

  return ret
}

type RowData = {
  data: number[]
  id: number
  total: number
  name: string
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

  const data: number[] = []
  for (let i = 1; i < rawData.length - 1; ++i) {
    const parsedNum = parseFloat(rawData[i].value)
    data.push(parsedNum ? parsedNum : 0)
  }

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

  const data: number[] = []
  for (let i = 1; i < rawData.length - 1; ++i) {
    const parsedNum = parseFloat(rawData[i].value)
    data.push(parsedNum ? parsedNum : 0)
  }

  return { data, id, total, name }
}

const getRowData = (row: CustomerSalesRow | CustomerSalesSectionRow): RowData =>
  row.type && row.type === "Section"
    ? getCustomerSalesSectionRowData(row)
    : getCustomerSalesRowData(row)

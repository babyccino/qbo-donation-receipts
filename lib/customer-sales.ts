export type CustomerSalesReport = {
  Header: {
    Time: string
    ReportName: string
    ReportBasis: string
    StartPeriod: string
    EndPeriod: string
    SummarizeColumnsBy: string
    Currency: string
    Option: {
      Name: string
      Value: string
    }[]
  }
  Columns: {
    Column: {
      ColTitle: string
      ColType: string
      MetaData?: {
        Name: string
        Value: string
      }[]
    }[]
  }
  Rows: {
    Row: (CustomerSalesRow | CustomerSalesSectionRow | CustomerSalesTotalsRow)[]
  }
}

export type CustomerSalesRow = {
  ColData: {
    value: string
    id?: string
  }[]
  type?: undefined
  group?: undefined
}

export type CustomerSalesSectionRow = {
  Header: {
    ColData: {
      value: string
      id?: string
    }[]
  }
  Rows: {
    Row: {
      ColData: {
        value: string
        id?: string
      }[]
      type: "Data"
    }[]
  }
  Summary: {
    ColData: {
      value: string
    }[]
  }
  type: "Section"
  group?: undefined
}

// last row is of this shape showing the totals of all the respective items
export type CustomerSalesTotalsRow = {
  Summary: {
    ColData: {
      value: string
    }[]
  }
  type: "Section"
  group: "GrandTotal"
}

export type CustomerData = {
  name: string
  id: number
  total: number
  products: { name: string; id: number; total: number }[]
}

export function processCustomerData(
  report: CustomerSalesReport,
  items: Set<number>
): CustomerData[] {
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
  const ret: CustomerData[] = []
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

function getRowData(row: CustomerSalesRow | CustomerSalesSectionRow): {
  data: number[]
  id: number
  total: number
  name: string
} {
  if (row.type && row.type === "Section") {
    if (!row.Header.ColData[0].id || !row.Header.ColData[0].value)
      throw new Error(`Customer section data is malformed, missing id or name\n`, row as any)

    const id = parseInt(row.Header.ColData[0].id as string)
    const name = row.Header.ColData[0].value

    const rawData = row.Summary.ColData
    const total = parseFloat(rawData.at(-1)!.value)

    const data: number[] = []
    for (let i = 1; i < rawData.length - 1; ++i) {
      const parsedNum = parseFloat(rawData[i].value)
      data.push(parsedNum ? parsedNum : 0)
    }

    return { data, id, total, name }
  } else {
    const rawData = row.ColData
    if (rawData[0].id === undefined)
      throw new Error(`Customer data is malformed, missing id or name\n`, row as any)
    const id = parseInt(rawData[0].id)
    const name = rawData[0].value
    const total = parseFloat(rawData.at(-1)!.value)

    const data: number[] = []
    for (let i = 1; i < rawData.length - 1; ++i) {
      const parsedNum = parseFloat(rawData[i].value)
      data.push(parsedNum ? parsedNum : 0)
    }

    return { data, id, total, name }
  }
}

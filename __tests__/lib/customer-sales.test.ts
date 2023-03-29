import { CustomerData, CustomerSalesReport, processCustomerData } from "../../lib/customer-sales"

const Header = Object.freeze({
  Time: "2023-03-23T14:08:37.242Z",
  ReportName: "Customer Sales Report",
  ReportBasis: "Accrual",
  StartPeriod: "2022-01-01",
  EndPeriod: "2022-12-31",
  SummarizeColumnsBy: "Name",
  Currency: "USD",
  Option: [],
})

describe("processCustomerData", () => {
  it("should convert a report with one customer and one product correctly", () => {
    const report: CustomerSalesReport = {
      Header,
      Columns: {
        Column: [
          {
            ColTitle: "Name",
            ColType: "String",
            MetaData: [
              {
                Name: "ID",
                Value: "123",
              },
            ],
          },
          {
            ColTitle: "Product A",
            ColType: "Amount",
            MetaData: [
              {
                Name: "ID",
                Value: "456",
              },
            ],
          },
          {
            ColTitle: "Total",
            ColType: "Amount",
            MetaData: [],
          },
        ],
      },
      Rows: {
        Row: [
          {
            ColData: [
              {
                value: "John",
                id: "123",
              },
              {
                value: "100.00",
                id: "",
              },
              {
                value: "100.00",
                id: "",
              },
            ],
          },
          {
            Summary: {
              ColData: [
                {
                  value: "TOTAL",
                },
                {
                  value: "100.00",
                },
                {
                  value: "100.00",
                },
              ],
            },
            type: "Section",
            group: "GrandTotal",
          },
        ],
      },
    }

    const expected: CustomerData[] = [
      {
        name: "John",
        id: 123,
        total: 100.0,
        products: [
          {
            name: "Product A",
            id: 456,
            total: 100.0,
          },
        ],
      },
    ]

    const result = processCustomerData(report, new Set([456]))
    expect(result).toEqual(expected)
  })

  it("should convert a report with one customer section and one product correctly", () => {
    const report: CustomerSalesReport = {
      Header,
      Columns: {
        Column: [
          {
            ColTitle: "",
            ColType: "Customer",
          },
          {
            ColTitle: "Product A",
            ColType: "Amount",
            MetaData: [
              {
                Name: "ID",
                Value: "456",
              },
            ],
          },
          {
            ColTitle: "Total",
            ColType: "Amount",
            MetaData: [],
          },
        ],
      },
      Rows: {
        Row: [
          {
            Header: {
              ColData: [
                {
                  value: "Jeff",
                  id: "22",
                },
                {
                  value: "100.00",
                },
                {
                  value: "100.00",
                },
              ],
            },
            Rows: {
              Row: [
                {
                  ColData: [
                    {
                      value: "Jeff's Mowing",
                      id: "23",
                    },
                    {
                      value: "",
                    },
                    {
                      value: "",
                    },
                  ],
                  type: "Data",
                },
              ],
            },
            Summary: {
              ColData: [
                {
                  value: "Total Jeff",
                },
                {
                  value: "100.00",
                },
                {
                  value: "100.00",
                },
              ],
            },
            type: "Section",
          },
          {
            Summary: {
              ColData: [
                {
                  value: "TOTAL",
                },
                {
                  value: "100.00",
                },
                {
                  value: "100.00",
                },
              ],
            },
            type: "Section",
            group: "GrandTotal",
          },
        ],
      },
    }

    const expected: CustomerData[] = [
      {
        name: "Jeff",
        id: 22,
        total: 100.0,
        products: [
          {
            name: "Product A",
            id: 456,
            total: 100.0,
          },
        ],
      },
    ]

    const result = processCustomerData(report, new Set([456]))
    expect(result).toEqual(expected)
  })

  it("selecting item which is not in customer's data gives empty array", () => {
    const report: CustomerSalesReport = {
      Header,
      Columns: {
        Column: [
          {
            ColTitle: "Name",
            ColType: "String",
            MetaData: [
              {
                Name: "ID",
                Value: "123",
              },
            ],
          },
          {
            ColTitle: "Product A",
            ColType: "Amount",
            MetaData: [
              {
                Name: "ID",
                Value: "456",
              },
            ],
          },
          {
            ColTitle: "Total",
            ColType: "Amount",
            MetaData: [],
          },
        ],
      },
      Rows: {
        Row: [
          {
            ColData: [
              {
                value: "John",
                id: "123",
              },
              {
                value: "100.00",
                id: "",
              },
              {
                value: "100.00",
                id: "",
              },
            ],
          },
          {
            Summary: {
              ColData: [
                {
                  value: "TOTAL",
                },
                {
                  value: "100.00",
                },
                {
                  value: "100.00",
                },
              ],
            },
            type: "Section",
            group: "GrandTotal",
          },
        ],
      },
    }

    const result = processCustomerData(report, new Set([1]))
    expect(result).toEqual([])
  })

  it("should convert a report with multiple products and customers correctly", () => {
    const report: CustomerSalesReport = {
      Header,
      Columns: {
        Column: [
          { ColTitle: "", ColType: "Customer" },
          { ColTitle: "Widget A", ColType: "Amount", MetaData: [{ Name: "ID", Value: "1001" }] },
          { ColTitle: "Widget B", ColType: "Amount", MetaData: [{ Name: "ID", Value: "1002" }] },
          { ColTitle: "Widget C", ColType: "Amount", MetaData: [{ Name: "ID", Value: "1003" }] },
          { ColTitle: "Total", ColType: "Amount", MetaData: [] },
        ],
      },
      Rows: {
        Row: [
          {
            ColData: [
              { value: "Customer A", id: "1" },
              { value: "10.00", id: "" },
              { value: "", id: "" },
              { value: "20.00", id: "" },
              { value: "30.00" },
            ],
          },
          {
            ColData: [
              { value: "Customer B", id: "2" },
              { value: "15.00", id: "" },
              { value: "25.00", id: "" },
              { value: "", id: "" },
              { value: "40.00" },
            ],
          },
          {
            ColData: [
              { value: "Customer C", id: "3" },
              { value: "20.00", id: "" },
              { value: "", id: "" },
              { value: "35.00", id: "" },
              { value: "55.00" },
            ],
          },
          {
            Summary: {
              ColData: [
                {
                  value: "TOTAL",
                },
                {
                  value: "45.00",
                },
                {
                  value: "25.00",
                },
                {
                  value: "55.00",
                },
                {
                  value: "125.00",
                },
              ],
            },
            type: "Section",
            group: "GrandTotal",
          },
        ],
      },
    }

    const expected: CustomerData[] = [
      {
        name: "Customer A",
        id: 1,
        total: 30,
        products: [
          { name: "Widget A", id: 1001, total: 10 },
          { name: "Widget C", id: 1003, total: 20 },
        ],
      },
      {
        name: "Customer B",
        id: 2,
        total: 40,
        products: [
          { name: "Widget A", id: 1001, total: 15 },
          { name: "Widget B", id: 1002, total: 25 },
        ],
      },
      {
        name: "Customer C",
        id: 3,
        total: 55,
        products: [
          { name: "Widget A", id: 1001, total: 20 },
          { name: "Widget C", id: 1003, total: 35 },
        ],
      },
    ]

    const result = processCustomerData(report, new Set([1001, 1002, 1003]))
    expect(result).toEqual(expected)

    const expected2: CustomerData[] = [
      {
        name: "Customer A",
        id: 1,
        total: 10,
        products: [{ name: "Widget A", id: 1001, total: 10 }],
      },
      {
        name: "Customer B",
        id: 2,
        total: 40,
        products: [
          { name: "Widget A", id: 1001, total: 15 },
          { name: "Widget B", id: 1002, total: 25 },
        ],
      },
      {
        name: "Customer C",
        id: 3,
        total: 20,
        products: [{ name: "Widget A", id: 1001, total: 20 }],
      },
    ]

    const result2 = processCustomerData(report, new Set([1001, 1002]))
    expect(result2).toEqual(expected2)
  })
})

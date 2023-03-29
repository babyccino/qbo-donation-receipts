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
})

export type QBOProfile = {
  sub: string
  aud: string[]
  auth_time: number
  iss: string
  exp: number
  iat: number
  realmid?: string
}

export type QboAccount = {
  provider: string
  type: string
  providerAccountId: string
  access_token: string
  token_type: string
  x_refresh_token_expires_in: number
  id_token: string
  refresh_token: string
  expires_at: number
  scope: string
  realmId?: string
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

export type Address = {
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

export type Customer = {
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

export type ColData = {
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

export type CustomerSalesReportError = {
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
export type CustomerSalesReportRow =
  | SalesRow
  | SalesSectionRow
  | NotSpecifiedSalesRow
  | SalesTotalsRow
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
  donorId: string
  total: number
  items: { name: string; id: string; total: number }[]
  address: string
  email: string | null
}
export type DonationWithoutAddress = Omit<Donation, "address" | "email">

export type Item = { name: string; id: string }

export type RowData = {
  data: number[]
  donorId: string
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

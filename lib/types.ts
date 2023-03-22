export type QBOProfile = {
  sub: string
  aud: string[]
  realmid: string
  auth_time: number
  iss: string
  exp: number
  iat: number
}

export type Item = {
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
    Item: Item[]
    startPosition: number
    maxResults: number
  }
  time: string
}

export type Session = {
  user: {
    id: string
    name: string
    image: string
    email: string
  }
  expires: string
  accessToken: string
  realmId: string
}

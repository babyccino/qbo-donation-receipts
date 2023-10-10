export namespace sharedStyle {
  export const topLogo = { margin: "10px auto 20px" }

  export const main = {
    fontFamily: '"Helvetica Neue",Helvetica,Arial,sans-serif',
    backgroundColor: "#ffffff",
  }

  export const resetText = {
    margin: "0",
    padding: "0",
    lineHeight: 1.4,
  }

  export const container = {
    margin: "0 auto",
    padding: "20px 0 20px",
    width: "660px",
  }

  export const text = {
    margin: "0",
    lineHeight: "2",
    color: "#747474",
    fontWeight: 500,
    whiteSpace: "pre-line" as const,
  }

  export const tableCell = { display: "table-cell" }

  export const heading = {
    fontSize: "32px",
    fontWeight: 300,
    color: "#888888",
  }

  export const informationTable = {
    borderCollapse: "collapse" as const,
    borderSpacing: "0px",
    color: "rgb(51,51,51)",
    backgroundColor: "rgb(250,250,250)",
    borderRadius: "3px",
    fontSize: "12px",
    marginTop: "12px",
  }

  export const informationTableRow = {
    height: "46px",
  }

  export const informationTableColumn = {
    paddingLeft: "20px",
    paddingRight: "20px",
    borderStyle: "solid" as const,
    borderColor: "white",
    borderWidth: "0px 1px 1px 0px",
    height: "44px",
  }

  export const informationTableLabel = {
    ...resetText,
    color: "rgb(102,102,102)",
    fontSize: "10px",
    // textTransform: "uppercase",
  }

  export const informationTableValue = {
    fontSize: "12px",
    margin: "0",
    padding: "0",
    lineHeight: 1.4,
  }

  export const productTitleTable = {
    ...informationTable,
    margin: "30px 0 15px 0",
    height: "24px",
  }

  export const productsTitle = {
    background: "#fafafa",
    paddingLeft: "10px",
    fontSize: "14px",
    fontWeight: 500,
    margin: "0",
  }

  export const productTitle = { fontSize: "12px", fontWeight: 600, ...resetText }

  export const productDescription = {
    fontSize: "12px",
    color: "rgb(102,102,102)",
    ...resetText,
  }

  export const productPriceTotal = {
    margin: "0",
    color: "rgb(102,102,102)",
    fontSize: "10px",
    fontWeight: 600,
    padding: "0px 30px 0px 0px",
    textAlign: "right" as const,
  }

  export const productPrice = {
    fontSize: "12px",
    fontWeight: 600,
    margin: "0",
  }

  export const productPriceLarge = {
    marginTop: "20px",
    fontSize: "16px",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    textAlign: "right" as const,
  }

  export const productPriceWrapper = {
    display: "table-cell",
    padding: "0px 20px 0px 0px",
    width: "100px",
    verticalAlign: "top",
  }

  export const productPriceLine = { margin: "30px 0 0 0" }

  export const productPriceVerticalLine = {
    height: "48px",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderLeftColor: "#EEEEEE",
  } as const

  export const productPriceLargeWrapper = { display: "table-cell", width: "90px" }

  export const productPriceLineBottom = { margin: "0 0 75px 0" }

  export const block = { display: "block" }

  export const footerCopyright = {
    margin: "25px 0 0 0",
    textAlign: "center" as const,
    fontSize: "12px",
    color: "rgb(102,102,102)",
  }
}

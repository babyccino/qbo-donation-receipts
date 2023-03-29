import styles from "./receipt.module.scss"

import { CustomerData } from "../lib/customer-sales"
import { formatDate, multipleClasses } from "../lib/util"
import { HTMLAttributes } from "react"
import Image from "next/image"

const Receipt = ({
  donation,
  receiptNo,
  donee,
  currentDate,
  donationDate,
  currency,
  className,
  ...attributes
}: {
  donation: CustomerData
  receiptNo: number
  donee: {
    name: string
    address: string
    registrationNumber: string
    country: string
    signatory: string
    signature: string
    smallLogo: string
    largeLogo?: string
  }
  currentDate: Date
  donationDate: Date
  currency: string
} & HTMLAttributes<HTMLDivElement>): JSX.Element => {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency })
  const formatCurrency = formatter.format.bind(formatter)

  return (
    <div className={multipleClasses(styles.container, className)} {...attributes}>
      <div className={multipleClasses(styles.titles, styles.flexSpaceBetween)}>
        <h1>Official donation receipt for income tax purposes</h1>
        <h1>Receipt# {receiptNo}</h1>
      </div>
      <div className={styles.flexSpaceBetween}>
        <div className={styles.flex}>
          <Image className={styles.smallLogo} alt="small organisation logo" src={donee.smallLogo} />
          <div>
            {donee.name}
            <br />
            {donee.address}
            <br />
            Charitable registration #: {donee.registrationNumber}
            <br />
          </div>
        </div>
        <div>
          Receipt issued: {formatDate(currentDate)}
          <br />
          Year donations received: {donationDate.getFullYear()}
          <br />
          Location Issued: {donee.country}
          <br />
        </div>
      </div>
      <div className={styles.donorDetails}>
        <strong>Donated by: </strong>
        {donation.name}
        <br />
        <strong>Address: </strong>
        123 fake street
        {/* TODO donor address*/}
      </div>
      <div className={styles.flexSpaceBetween}>
        <div className={styles.gift}>
          Eligible amount of gift for tax purposes:
          <div className={styles.giftAmount}>{formatCurrency(donation.total)}</div>
        </div>
        <div className={styles.signature}>
          <Image alt="signature" src={donee.signature} />
          <div>{donee.signatory}</div>
        </div>
      </div>
      <div className={styles.alignCenter}>
        Canada Revenue Agency:&nbsp;
        <a href="https://www.canada.ca/charities-giving">www.canada.ca/charities-giving</a>
      </div>
      <hr className={styles.break} />
      <div className={styles.alignCenter}>For your own records</div>
      <Image
        className={styles.largeLogo}
        alt="large organisation logo"
        src={donee.largeLogo || donee.smallLogo}
      />
      <h2 className={styles.ownRecordsOrg}>{donee.name}</h2>
      <div className={styles.flexSpaceBetween}>
        <div>
          {donation.name}
          <br />
          123 fake street
          {/* TODO donor address*/}
        </div>
        <div>
          <strong>Receipt No:</strong> {receiptNo}
          <br />
          <strong>Receipt issued:</strong> {formatDate(currentDate)}
          <br />
          <strong>Year donations received:</strong> {donationDate.getFullYear()}
          <br />
          <strong>Total:</strong> {formatCurrency(donation.total)}
        </div>
      </div>
      <table className={multipleClasses(styles.table, styles.alignCenter)}>
        <tr className={styles.tableHeadings}>
          <th className={styles.textAlignRight}>
            <strong>Category</strong>
          </th>
          <th className={styles.textAlignLeft}>
            <strong>Amount</strong>
          </th>
        </tr>
        {donation.products.map(item => (
          <tr key={item.id}>
            <td className={styles.textAlignRight}>{item.name}</td>
            <td className={styles.textAlignLeft}>{formatCurrency(item.total)}</td>
          </tr>
        ))}
      </table>
    </div>
  )
}

export default Receipt

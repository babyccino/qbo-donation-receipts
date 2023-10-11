import { ArrowDownTrayIcon, PlusIcon } from "@heroicons/react/24/solid"
import { Spinner } from "flowbite-react"

import { buttonStyling } from "@/components/link"

export const downloadReceiptInner = (
  <>
    <span className="hidden sm:inline">Download</span>
    <ArrowDownTrayIcon className="inline-block h-5 w-5 sm:ml-2" />
  </>
)
export const showReceiptInner = (
  <>
    <span className="hidden sm:inline">Show Receipt</span>
    <PlusIcon className="inline-block h-5 w-5 sm:ml-2" />
  </>
)

export const DummyShowReceipt = () => <div className={buttonStyling}>{showReceiptInner}</div>
export const DummyDownloadReceipt = () => (
  <div className={buttonStyling}>{downloadReceiptInner}</div>
)

export const DownloadReceiptLoading = () => (
  <div className={buttonStyling + " relative"}>{downloadReceiptLoadingInner}</div>
)
export const downloadReceiptLoadingInner = (
  <>
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <Spinner />
    </span>
    <span className="opacity-0">{downloadReceiptInner}</span>
  </>
)
export const ShowReceiptLoading = () => (
  <div className={buttonStyling + " relative"}>
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <Spinner />
    </span>
    <span className="opacity-0">{showReceiptInner}</span>
  </div>
)

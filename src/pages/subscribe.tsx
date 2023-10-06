import { Button } from "flowbite-react"

import { PricingCard } from "@/components/ui"
import { subscribe } from "@/lib/util/request"

export default function Subscribe() {
  return (
    <section className="p-4 sm:flex sm:min-h-screen sm:flex-row sm:justify-center sm:p-10">
      <div className="border-b border-solid border-slate-700 pb-8 text-white sm:border-b-0 sm:border-r sm:p-14">
        <PricingCard title="Your selected plan" plan="free" />
      </div>
      <div className="pt-8 text-white sm:p-14">
        <PricingCard
          title="Subscribe to use this feature"
          plan="pro"
          button={
            <Button
              onClick={e => {
                e.preventDefault()
                subscribe("/email")
              }}
            >
              Go pro
            </Button>
          }
        />
      </div>
    </section>
  )
}

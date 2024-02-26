import { afterAll, beforeAll } from "bun:test"

import { APIGatewayProxyEvent } from "aws-lambda"
import { HttpResponse, http } from "msw"
import { SetupServer, setupServer } from "msw/node"

import { lambdaHandler } from "@/lambda"
import { makeQueryUrl, makeSalesReportUrl } from "@/lib/qbo-api"
import { config } from "@/lib/util/config"
import { deleteAll, mockResponses, testRealmId } from "./mocks"

let server: SetupServer
beforeAll(async () => {
  await deleteAll()

  const queryUrl = makeQueryUrl(testRealmId, "query")
  const salesReportUrl = makeSalesReportUrl(testRealmId, {
    startDate: new Date("2022-01-01"),
    endDate: new Date("2022-12-31"),
  })

  const { items, customerQueryResult, itemQueryResponse, customerSalesReport } = mockResponses
  console.log("setup items: ", items[0].id)
  const handlers = [
    http.get(queryUrl, ({ request }) => {
      const url = new URL(request.url)
      const query = url.searchParams.get("query")
      if (query === "select * from Customer MAXRESULTS 1000")
        return HttpResponse.json(customerQueryResult)
      if (query === "select * from Item") return HttpResponse.json(itemQueryResponse)
      return HttpResponse.error()
    }),
    http.get(salesReportUrl, () => HttpResponse.json(customerSalesReport)),
    http.post(config.emailWorkerUrl, async ({ request }) => {
      const rawBody = await request.text()
      const req = { body: rawBody }
      const res = await lambdaHandler(req as APIGatewayProxyEvent)
      return HttpResponse.json(res.body, { status: res.statusCode })
    }),
  ]

  server = setupServer(...handlers)
  server.listen()
})

afterAll(async () => {
  server?.close()
  await deleteAll()
})

if (config.nodeEnv !== "test") {
  throw new Error("This test can only be run in test mode")
}

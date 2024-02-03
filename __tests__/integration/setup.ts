import { afterAll, beforeAll } from "bun:test"
import { HttpResponse, http } from "msw"
import { SetupServer, setupServer } from "msw/node"

import { makeQueryUrl } from "@/lib/qbo-api"
import { config } from "@/lib/util/config"
import { deleteAll, mockItemQueryResponse, testRealmId } from "./mocks"

let server: SetupServer
beforeAll(async () => {
  await deleteAll()

  const url = makeQueryUrl(testRealmId, "select * from Item")
  const handlers = [
    http.get(url, () => {
      return HttpResponse.json(mockItemQueryResponse)
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

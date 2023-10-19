import { describe, test } from "bun:test"
import { NextApiRequest, NextApiResponse } from "next"
import { encode } from "next-auth/jwt"

import { config } from "@/lib/util/config"
import { createAuthorisedHandler } from "@/lib/util/request-server"
import { DataType, createHandler } from "@/pages/api/_details"
import { authOptions } from "@/tests/integration/auth"
import { fileStorage, user } from "@/tests/integration/db"

const req = {
  _readableState: {
    state: 194614,
    highWaterMark: 16384,
    buffer: { head: null, tail: null, length: 0 },
    length: 0,
    pipes: [],
    flowing: true,
    errored: null,
    defaultEncoding: "utf8",
    awaitDrainWriters: null,
    decoder: null,
    encoding: null,
  },
  _eventsCount: 2,
  _maxListeners: undefined,
  httpVersionMajor: 1,
  httpVersionMinor: 1,
  httpVersion: "1.1",
  complete: true,
  rawHeaders: [
    "Host",
    "localhost:3000",
    "Connection",
    "keep-alive",
    "Cache-Control",
    "max-age=0",
    "sec-ch-ua",
    '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    "sec-ch-ua-mobile",
    "?0",
    "sec-ch-ua-platform",
    '"macOS"',
    "DNT",
    "1",
    "Upgrade-Insecure-Requests",
    "1",
    "User-Agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    "Accept",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Sec-Fetch-Site",
    "same-origin",
    "Sec-Fetch-Mode",
    "navigate",
    "Sec-Fetch-User",
    "?1",
    "Sec-Fetch-Dest",
    "document",
    "Accept-Encoding",
    "gzip, deflate, br",
    "Accept-Language",
    "en-US,en;q=0.9",
    "Cookie",
    "next-auth.csrf-token=e08a152554e48ac056fff459048b794abf1d333c52059a27820fe68adfe87f8b%7Ceb38653aef3b9e52d8d4caa42fb92f03f9a1e678d140742dbf1f68741733ea9f; next-auth.callback-url=http%3A%2F%2Flocalhost%3A3000%2F",
    "sec-gpc",
    "1",
  ],
  rawTrailers: [],
  joinDuplicateHeaders: null,
  aborted: false,
  upgrade: false,
  url: "/api/test-api",
  method: "GET",
  statusCode: null,
  statusMessage: null,
  _consuming: false,
  _dumped: false,
  query: {},
  body: "",
  [Symbol("kHeaders")]: {
    host: "localhost:3000",
    connection: "keep-alive",
    "cache-control": "max-age=0",
    "sec-ch-ua": '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    dnt: "1",
    "upgrade-insecure-requests": "1",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "navigate",
    "sec-fetch-user": "?1",
    "sec-fetch-dest": "document",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9",
    cookie:
      "next-auth.csrf-token=e08a152554e48ac056fff459048b794abf1d333c52059a27820fe68adfe87f8b%7Ceb38653aef3b9e52d8d4caa42fb92f03f9a1e678d140742dbf1f68741733ea9f; next-auth.callback-url=http%3A%2F%2Flocalhost%3A3000%2F",
    "sec-gpc": "1",
    "x-middleware-invoke": "",
    "x-invoke-path": "/api/test-api",
    "x-invoke-query": "%7B%7D",
    "x-invoke-output": "/api/test-api",
  },
  [Symbol("kHeadersCount")]: 36,
  [Symbol("kTrailers")]: null,
  [Symbol("kTrailersCount")]: 0,
  [Symbol("NextInternalRequestMeta")]: {
    __NEXT_INIT_URL: "http://localhost:3000/api/test-api",
    __NEXT_INIT_QUERY: {},
    _protocol: "http",
    __nextIsLocaleDomain: false,
    _nextIncrementalCache: {
      dev: true,
      minimalMode: false,
      requestHeaders: [Object],
      requestProtocol: "http",
      allowedRevalidateHeaderKeys: undefined,
      prerenderManifest: [Object],
      fetchCacheKeyPrefix: "",
    },
    _nextMatch: { definition: [Object], params: undefined },
  },
}

const res = {
  getHeader: () => {},
  setHeader: () => res,
  status: () => res,
  end: () => {},
  json: () => {},
}
describe("details api route", () => {
  test("sets all fields of test user", async () => {
    const cookie = await encode({
      secret: config.nextauthJwtSecret,
      token: {
        accessToken: "accessToken",
        realmid: "1234",
        qboPermission: 0,
        id: "testId",
        name: "John Smith",
        email: "test@test.com",
        realmId: "12345",
      },
    })
    const body: DataType = {
      companyAddress: "testCompanyAddress",
      companyName: "testCompanyName",
      country: "testCountry",
      registrationNumber: "123456789RR1234",
      signatoryName: "gus",
    }
    const request = {
      ...req,
      method: "POST",
      cookies: {
        "next-auth.session-token": cookie,
      },
      body,
    }
    try {
      const response = await createAuthorisedHandler(
        authOptions,
        createHandler(user, fileStorage),
        ["POST"],
      )(request as unknown as NextApiRequest, res as unknown as NextApiResponse)
      console.log(response)
    } catch (error) {
      console.error(error)
    }
  })
})

import { describe } from "bun:test"

describe("email worker", () => {
  // test("should send emails", async () => {
  //   const { account, session, deleteUser, user } = await createUser(true)
  //   const selectedItems = mockResponses.items.map(({ id }) => id)
  //   const startDate = new Date("2023-01-01")
  //   const endDate = new Date("2023-12-31")
  //   const [doneeInfo, userData, subscription] = await Promise.all([
  //     (async () => {
  //       const img = Bun.file("__tests__/test-files/test.webp")
  //       const buf = await img.arrayBuffer()
  //       const testImage = await uploadWebpImage(Buffer.from(buf), "test/test.webp", true)
  //       const doneeInfoId = createId()
  //       const [doneeInfo] = await db
  //         .insert(doneeInfos)
  //         .values({
  //           id: doneeInfoId,
  //           companyAddress: "123 Fake St.",
  //           companyName: "Charity",
  //           country: "Canada",
  //           accountId: account.id,
  //           registrationNumber: "123456789RR0001",
  //           signatoryName: "John Smith",
  //           smallLogo: testImage,
  //           largeLogo: testImage,
  //           signature: testImage,
  //         })
  //         .returning()
  //       return doneeInfo
  //     })(),
  //     (async () => {
  //       const userDataId = createId()
  //       const [userData] = await db
  //         .insert(userDatas)
  //         .values({
  //           accountId: account.id,
  //           startDate,
  //           endDate,
  //           id: userDataId,
  //           items: selectedItems.join(","),
  //         })
  //         .returning()
  //       return userData
  //     })(),
  //     (async () => {
  //       const subscriptionId = createId()
  //       const [subscription] = await db
  //         .insert(subscriptions)
  //         .values({
  //           id: subscriptionId,
  //           currentPeriodEnd: new Date("2050-12-31"),
  //           status: "active",
  //           currentPeriodStart: new Date("2023-01-01"),
  //           userId: user.id,
  //           cancelAtPeriodEnd: false,
  //         })
  //         .returning()
  //       return subscription
  //     })(),
  //   ])
  //   const donations = await getDonations(
  //     account.accessToken as string,
  //     account.realmId as string,
  //     { startDate: userData.startDate, endDate: userData.endDate },
  //     userData.items ? userData.items.split(",") : [],
  //   )
  //   const checksum = makeChecksum(JSON.stringify(donations))
  //   const body: EmailDataType = {
  //     checksum,
  //     emailBody: "test email body",
  //     recipientIds: mockResponses.customers.map(({ donorId }) => donorId),
  //     awaitEmailTask: true,
  //   }
  //   const req = {
  //     method: "POST",
  //     cookies: {
  //       "next-auth.session-token": session.sessionToken,
  //     },
  //     body,
  //   }
  //   let emailRes: any = undefined
  //   const json = mock((json: any) => {
  //     emailRes = json
  //   })
  //   const send = mock((json: any) => {})
  //   let res: any
  //   const status = mock((statusCode: number) => res)
  //   res = {
  //     getHeader: () => {},
  //     setHeader: () => res,
  //     end: () => {},
  //     json,
  //     send,
  //     status,
  //   }
  //   // const { req, res } = getMockApiContext("POST", session.sessionToken, body)
  //   const response = await handler(
  //     req as unknown as NextApiRequest,
  //     res as unknown as NextApiResponse,
  //   )
  //   expect(json).toHaveBeenCalledWith(expect.anything())
  //   expect(emailRes.campaignId).toBeDefined()
  //   expect(status).toHaveBeenCalledWith(200)
  //   await wait(4000)
  //   const count = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(receipts)
  //   console.log({ count })
  //   await Promise.all([
  //     deleteUser(),
  //     db.delete(userDatas).where(eq(userDatas.id, userData.id)),
  //     db.delete(subscriptions).where(eq(subscriptions.id, subscription.id)),
  //     db.delete(doneeInfos).where(eq(doneeInfos.id, doneeInfo.id)),
  //     db.delete(campaigns).where(eq(campaigns.id, emailRes.campaignId as any as string)),
  //     db.delete(receipts).where(eq(receipts.campaignId, emailRes.campaignId as any as string)),
  //   ])
  // })
})

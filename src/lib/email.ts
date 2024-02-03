import { getThisYear } from "@/lib/util/date"
import { Donation as DbDonation, EmailHistory as DbEmailHistory } from "db/schema"

export const templateDonorName = "FULL_NAME"
export const formatEmailBody = (str: string, donorName: string) =>
  str.replaceAll(templateDonorName, donorName)

export const defaultEmailBody = `Dear ${templateDonorName},

We hope this message finds you in good health and high spirits. On behalf of our organisation, we would like to extend our heartfelt gratitude for your recent contribution. Your generosity and support play a vital role in our mission to [state the mission or purpose of the organization].

With your continued support, we will be able to [describe how the funds will be utilized or the impact they will make]. Your contribution makes a significant difference in the lives of those we serve, and we are deeply grateful for your commitment to our cause.

We believe that true change is made possible through collective efforts, and your support exemplifies the power of individuals coming together for a common purpose. Together, we are making a positive impact and bringing hope to those in need.

Once again, we express our sincerest appreciation for your contribution. It is donors like you who inspire us to continue our work and strive for greater achievements. We are honored to have you as part of our compassionate community.

If you have any questions or would like further information about our organization and how your donation is being utilized, please feel free to reach out to us. We value your feedback and involvement.

Thank you once again for your generosity, compassion, and belief in our mission.

Attached is your Income Tax Receipt for the ${getThisYear()} taxation year.

With gratitude,`

type EmailHistory = (Pick<DbEmailHistory, "createdAt" | "startDate" | "endDate"> & {
  donations: Pick<DbDonation, "name" | "donorId">[]
})[]
export function trimHistoryById(
  recipientIds: Set<string>,
  emailHistory: EmailHistory,
): EmailHistory | null {
  const relevantEmailHistory: EmailHistory = []
  for (const entry of emailHistory) {
    const customerOverlap = entry.donations.filter(el => recipientIds.has(el.donorId))
    if (customerOverlap.length === 0) continue
    relevantEmailHistory.push({ ...entry, donations: customerOverlap })
  }
  if (relevantEmailHistory.length === 0) return null
  else return relevantEmailHistory
}

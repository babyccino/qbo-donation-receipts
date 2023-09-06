export const templateDonorName = "FULL_NAME"
export const formatEmailBody = (str: string, donorName: string) =>
  str.replaceAll(templateDonorName, donorName)

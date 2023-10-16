import { Resend } from "resend"

import { config } from "@/lib/util/config"

const resend = new Resend(config.resendApiKey)
export default resend

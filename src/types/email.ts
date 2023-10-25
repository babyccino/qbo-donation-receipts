export type EmailService = {
  send: (props: {
    from: string
    to: string
    reply_to: string
    subject: string
    text?: string
    attachments?: { filename: string; content: Buffer }[]
    react?: JSX.Element
  }) => Promise<void>
}

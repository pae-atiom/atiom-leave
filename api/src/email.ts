// Outbound email transport. Three interchangeable modes chosen by EMAIL_MODE,
// mirroring the local|cognito split used for auth:
//   - console (default): log the message to stdout. Zero dependencies, always
//     works — fine for pure-local dev and CI.
//   - smtp: send to a local SMTP sink (Mailpit on :1025) via nodemailer, so the
//     mail is visible in a real inbox UI at http://localhost:8025.
//   - ses: AWS SES SendEmail (Phase 3, in-Lambda). Lazy-loaded.
//
// Email AUGMENTS the in-app Notification records — it never replaces them and is
// strictly best-effort: a transport failure must not fail the underlying
// mutation (see callers, which swallow errors).

export type EmailMode = 'console' | 'smtp' | 'ses'

const EMAIL_MODE: EmailMode = (process.env.EMAIL_MODE as EmailMode) ?? 'console'
const FROM = process.env.EMAIL_FROM ?? 'atiom-leave@example.com'

export interface EmailMessage {
  to: string
  subject: string
  text: string
}

// ── smtp (Mailpit) — nodemailer lazily so console/ses never load it ──────────
let transportPromise: Promise<{
  sendMail: (opts: Record<string, unknown>) => Promise<unknown>
}> | null = null
function smtpTransport() {
  if (!transportPromise) {
    transportPromise = import('nodemailer').then((nm) =>
      nm.createTransport({
        host: process.env.SMTP_HOST ?? 'localhost',
        port: Number(process.env.SMTP_PORT ?? 1025),
        secure: false,
        // Mailpit accepts unauthenticated mail; ignore TLS for the local sink.
        tls: { rejectUnauthorized: false },
      }),
    )
  }
  return transportPromise
}

// ── ses — @aws-sdk/client-ses lazily (only in prod) ──────────────────────────
let sesPromise: Promise<{
  send: (msg: EmailMessage) => Promise<unknown>
}> | null = null
function sesSender() {
  if (!sesPromise) {
    sesPromise = import('@aws-sdk/client-ses').then(
      ({ SESClient, SendEmailCommand }) => {
        const client = new SESClient({
          region: process.env.AWS_REGION ?? 'us-east-1',
        })
        return {
          send: (msg: EmailMessage) =>
            client.send(
              new SendEmailCommand({
                Source: FROM,
                Destination: { ToAddresses: [msg.to] },
                Message: {
                  Subject: { Data: msg.subject },
                  Body: { Text: { Data: msg.text } },
                },
              }),
            ),
        }
      },
    )
  }
  return sesPromise
}

/** Deliver one message via the configured transport. Throws on transport error
 *  (callers decide whether to swallow). */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  switch (EMAIL_MODE) {
    case 'smtp': {
      const t = await smtpTransport()
      await t.sendMail({ from: FROM, to: msg.to, subject: msg.subject, text: msg.text })
      return
    }
    case 'ses': {
      const s = await sesSender()
      await s.send(msg)
      return
    }
    default:
      console.log(
        `📧 [email:console] to=${msg.to} subject="${msg.subject}"\n${msg.text}\n`,
      )
  }
}

export type MailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  body: string;
  attachments?: MailAttachment[];
};

export type MailSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export interface MailSender {
  send(message: MailMessage): Promise<MailSendResult>;
}

/** Sender em memória para testes e dev (não envia SMTP real). */
export class InMemoryMailSender implements MailSender {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<MailSendResult> {
    if (!message.to.includes("@")) {
      return { ok: false, error: "E-mail do destinatário inválido" };
    }
    this.sent.push(message);
    return { ok: true, messageId: `mem-${this.sent.length}` };
  }
}

let defaultMail: MailSender = new InMemoryMailSender();

export function getMailSender(): MailSender {
  return defaultMail;
}

export function setMailSender(sender: MailSender): void {
  defaultMail = sender;
}

export function resetMailSender(): void {
  defaultMail = new InMemoryMailSender();
}

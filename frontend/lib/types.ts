export type EmailInput = {
  sender_name?: string | null;
  sender_email: string;
  subject: string;
  body_text: string;
  links: string[];
  known_contact: boolean;
  in_reply_thread: boolean;
  starred: boolean;
};

export type ClassificationResult = {
  category: string;
  risk_score: number;
  confidence_score: number;
  reasons: string[];
  matched_rules: { rule_id: string; weight: number; reason: string }[];
  recommended_action: string;
  used_llm: boolean;
};

export type StoredEmailRecord = {
  id: string;
  gmailMessageId: string | null;
  threadId: string | null;
  source: string;
  senderName: string | null;
  senderEmail: string;
  subject: string;
  bodyText: string;
  category: string;
  riskScore: number;
  confidenceScore: number;
  recommendedAction: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InboxSummary = {
  total: number;
  scams: number;
  opportunities: number;
  handled: number;
};

export type GmailStatus = {
  connected: boolean;
  has_refresh_token: boolean;
  scopes: string[];
  token_expiry?: string | null;
  note: string;
};

export type GmailSyncMessage = {
  gmail_message_id: string;
  thread_id?: string | null;
  email: EmailInput;
  classification: ClassificationResult;
  received_at?: string | null;
  source: string;
};

export type ActivityLogEntry = {
  id: string;
  type: 'login' | 'manual_classification' | 'gmail_connected' | 'gmail_disconnected' | 'gmail_synced' | 'logout';
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

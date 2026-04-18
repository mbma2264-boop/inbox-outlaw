from typing import List, Literal, Optional

from pydantic import BaseModel, Field


Category = Literal[
    "Scam",
    "Likely Scam",
    "Personal",
    "Opportunity",
    "Verified Business",
    "Promotion",
    "Transactional",
    "Needs Review",
]


class EmailInput(BaseModel):
    sender_name: Optional[str] = None
    sender_email: str
    subject: str
    body_text: str
    links: List[str] = Field(default_factory=list)
    known_contact: bool = False
    in_reply_thread: bool = False
    starred: bool = False


class RuleMatch(BaseModel):
    rule_id: str
    weight: int
    reason: str


class ClassificationResult(BaseModel):
    category: Category
    risk_score: int = Field(ge=0, le=100)
    confidence_score: int = Field(ge=0, le=100)
    reasons: List[str]
    matched_rules: List[RuleMatch]
    recommended_action: str
    used_llm: bool = False


class GmailOAuthStartResponse(BaseModel):
    authorization_url: str
    state: str
    note: str


class GmailOAuthCallbackResponse(BaseModel):
    code: Optional[str] = None
    state: Optional[str] = None
    note: str
    connected: bool = False
    redirect_to: Optional[str] = None


class GmailConnectionStatus(BaseModel):
    connected: bool
    has_refresh_token: bool
    scopes: List[str] = Field(default_factory=list)
    token_expiry: Optional[str] = None
    note: str


class GmailSyncedMessage(BaseModel):
    gmail_message_id: str
    thread_id: Optional[str] = None
    email: EmailInput
    classification: ClassificationResult
    received_at: Optional[str] = None
    source: str = "gmail"


class GmailSyncResponse(BaseModel):
    imported_count: int
    next_page_token: Optional[str] = None
    messages: List[GmailSyncedMessage]

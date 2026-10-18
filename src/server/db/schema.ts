/**
 * Modelo de dados da Dominus Payments (PostgreSQL 16+, Drizzle ORM).
 *
 * Convenções:
 * - IDs: uuid v4 gerados no banco. IDs públicos com prefixo (pi_, txn_, re_…) ficam em `public_id`.
 * - Dinheiro: bigint em centavos (`amount`), sempre com `currency`.
 * - Todo registro de negócio pertence a uma organização (`organization_id`) — base do isolamento.
 * - Registros financeiros históricos não são editados nem apagados: ledger_entries e audit_logs
 *   são protegidos por triggers (drizzle/0001_immutability.sql). Correções usam lançamentos compensatórios.
 * - Timestamps com fuso (timestamptz). Exibição em America/Sao_Paulo é responsabilidade da interface.
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { TRANSACTION_STATUSES } from "@/server/domain/transactions/state-machine";

/* ─────────────────────────── Helpers ─────────────────────────── */

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const money = (name: string) => bigint(name, { mode: "number" });
const orgRef = () =>
  uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "restrict" });

/* ─────────────────────────── Enums ─────────────────────────── */

export const currencyEnum = pgEnum("currency", ["BRL"]);
export const paymentMethodEnum = pgEnum("payment_method", ["pix", "credit_card", "debit_card", "boleto"]);
export const transactionStatusEnum = pgEnum("transaction_status", TRANSACTION_STATUSES);
export const paymentIntentStatusEnum = pgEnum("payment_intent_status", [
  "requires_payment",
  "processing",
  "succeeded",
  "cancelled",
  "expired",
  "failed",
]);
export const refundStatusEnum = pgEnum("refund_status", ["requested", "pending", "succeeded", "failed"]);
export const disputeStatusEnum = pgEnum("dispute_status", [
  "opened",
  "evidence_required",
  "under_review",
  "won",
  "lost",
  "closed",
]);
export const kycStatusEnum = pgEnum("kyc_status", [
  "not_started",
  "in_progress",
  "documents_pending",
  "under_review",
  "additional_info_required",
  "approved",
  "rejected",
  "suspended",
  "reassessment_required",
]);
export const accountTypeEnum = pgEnum("account_type", ["individual", "business"]);
export const kycDocumentTypeEnum = pgEnum("kyc_document_type", [
  "identity_front",
  "identity_back",
  "selfie",
  "proof_of_address",
  "articles_of_incorporation",
  "cnpj_card",
  "representative_authorization",
  "other",
]);
export const kycReviewDecisionEnum = pgEnum("kyc_review_decision", [
  "approve",
  "reject",
  "request_info",
  "suspend",
  "request_reassessment",
]);
export const organizationStatusEnum = pgEnum("organization_status", ["active", "restricted", "suspended", "closed"]);
export const memberStatusEnum = pgEnum("member_status", ["invited", "active", "disabled"]);
export const apiKeyModeEnum = pgEnum("api_key_mode", ["test", "live"]);
export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "succeeded",
  "failed",
  "dead_letter",
]);
export const ledgerDirectionEnum = pgEnum("ledger_direction", ["debit", "credit"]);
export const reconciliationRunStatusEnum = pgEnum("reconciliation_run_status", [
  "running",
  "completed",
  "failed",
]);
export const reconciliationItemKindEnum = pgEnum("reconciliation_item_kind", [
  "matched",
  "amount_mismatch",
  "status_mismatch",
  "missing_internal",
  "missing_provider",
  "duplicate",
  "late_payment",
]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "pending_customer", "resolved", "closed"]);

/* ─────────────────────────── Identidade ─────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /** Hash Argon2id (Fase 4). Nunca a senha. */
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    /** Segredo TOTP cifrado em repouso (envelope encryption, Fase 4). */
    mfaSecretEncrypted: text("mfa_secret_encrypted"),
    isPlatformStaff: boolean("is_platform_staff").notNull().default(false),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 do token opaco. O token em si só existe no cookie HttpOnly. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    mfaVerifiedAt: timestamp("mfa_verified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 32 }).notNull(), // email_verification | password_reset
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_uq").on(t.tokenHash)],
);

/* ─────────────────────────── Organizações e RBAC ─────────────────────────── */

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    accountType: accountTypeEnum("account_type").notNull(),
    status: organizationStatusEnum("status").notNull().default("active"),
    /** Liberada para operar em produção somente com KYC/KYB aprovado. */
    liveModeEnabled: boolean("live_mode_enabled").notNull().default(false),
    allowedReturnUrls: jsonb("allowed_return_urls").$type<string[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("organizations_public_id_uq").on(t.publicId)],
);

export const roles = pgTable(
  "roles",
  {
    id: id(),
    /** owner | org_admin | finance | operator | developer | support | kyc_analyst | platform_admin | auditor */
    key: varchar("key", { length: 48 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    scope: varchar("scope", { length: 16 }).notNull(), // organization | platform
    description: text("description"),
  },
  (t) => [uniqueIndex("roles_key_uq").on(t.key)],
);

export const permissions = pgTable(
  "permissions",
  {
    id: id(),
    /** Ex.: transactions.read, refunds.create, kyc.documents.read, members.manage */
    key: varchar("key", { length: 64 }).notNull(),
    description: text("description").notNull(),
  },
  (t) => [uniqueIndex("permissions_key_uq").on(t.key)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: id(),
    organizationId: orgRef(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    status: memberStatusEnum("status").notNull().default("invited"),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("org_members_org_user_uq").on(t.organizationId, t.userId),
    index("org_members_user_idx").on(t.userId),
  ],
);

/* ─────────────────────────── KYC / KYB ─────────────────────────── */

export const kycCases = pgTable(
  "kyc_cases",
  {
    id: id(),
    organizationId: orgRef(),
    status: kycStatusEnum("status").notNull().default("not_started"),
    accountType: accountTypeEnum("account_type").notNull(),
    /** Rascunho do onboarding, salvo por etapa. Dados pessoais minimizados. */
    profile: jsonb("profile").$type<Record<string, unknown>>().notNull().default({}),
    currentStep: integer("current_step").notNull().default(1),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    externalProvider: varchar("external_provider", { length: 64 }),
    externalReference: varchar("external_reference", { length: 128 }),
    /** Data a partir da qual os documentos podem ser descartados/anonimizados. */
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("kyc_cases_org_idx").on(t.organizationId), index("kyc_cases_status_idx").on(t.status)],
);

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: id(),
    organizationId: orgRef(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => kycCases.id, { onDelete: "restrict" }),
    type: kycDocumentTypeEnum("type").notNull(),
    /** Chave no armazenamento privado. Nunca uma URL pública. */
    storageKey: text("storage_key").notNull(),
    /** Tipo detectado pelos bytes do arquivo (magic number), não pela extensão. */
    detectedMimeType: varchar("detected_mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id),
    supersededById: uuid("superseded_by_id"),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("kyc_documents_case_idx").on(t.caseId),
    check("kyc_documents_size_ck", sql`${t.sizeBytes} > 0 AND ${t.sizeBytes} <= 15728640`),
  ],
);

export const kycReviews = pgTable(
  "kyc_reviews",
  {
    id: id(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => kycCases.id, { onDelete: "restrict" }),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id),
    decision: kycReviewDecisionEnum("decision").notNull(),
    fromStatus: kycStatusEnum("from_status").notNull(),
    toStatus: kycStatusEnum("to_status").notNull(),
    justification: text("justification").notNull(),
    requestedItems: jsonb("requested_items").$type<string[]>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("kyc_reviews_case_idx").on(t.caseId),
    check("kyc_reviews_justification_ck", sql`length(trim(${t.justification})) >= 10`),
  ],
);

export const consents = pgTable(
  "consents",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 64 }).notNull(),
    policyVersion: varchar("policy_version", { length: 32 }).notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ip: inet("ip"),
  },
  (t) => [index("consents_user_idx").on(t.userId)],
);

/* ─────────────────────────── Provedores ─────────────────────────── */

export const providerAccounts = pgTable(
  "provider_accounts",
  {
    id: id(),
    organizationId: orgRef(),
    provider: varchar("provider", { length: 64 }).notNull(),
    mode: apiKeyModeEnum("mode").notNull(),
    /** Credenciais cifradas (envelope encryption). Nunca retornadas pela API após o cadastro. */
    credentialsEncrypted: text("credentials_encrypted").notNull(),
    credentialsLast4: varchar("credentials_last4", { length: 4 }),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("provider_accounts_org_provider_mode_uq").on(t.organizationId, t.provider, t.mode)],
);

export const providerEvents = pgTable(
  "provider_events",
  {
    id: id(),
    provider: varchar("provider", { length: 64 }).notNull(),
    /** ID do evento no provedor — impede processar o mesmo webhook duas vezes. */
    externalEventId: varchar("external_event_id", { length: 191 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    payload: jsonb("payload").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingError: text("processing_error"),
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => [uniqueIndex("provider_events_dedup_uq").on(t.provider, t.externalEventId)],
);

/* ─────────────────────────── Pagamentos ─────────────────────────── */

export const paymentCustomers = pgTable(
  "payment_customers",
  {
    id: id(),
    organizationId: orgRef(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 320 }),
    /** CPF/CNPJ apenas quando o provedor exige. */
    document: varchar("document", { length: 14 }),
    externalReference: varchar("external_reference", { length: 128 }),
    /** Cliente bloqueado manualmente pelo lojista. */
    blocked: boolean("blocked").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payment_customers_public_id_uq").on(t.publicId),
    index("payment_customers_org_idx").on(t.organizationId),
  ],
);

export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: id(),
    organizationId: orgRef(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    mode: apiKeyModeEnum("mode").notNull(),
    customerId: uuid("customer_id").references(() => paymentCustomers.id),
    amount: money("amount").notNull(),
    currency: currencyEnum("currency").notNull().default("BRL"),
    method: paymentMethodEnum("method").notNull(),
    status: paymentIntentStatusEnum("status").notNull().default("requires_payment"),
    description: varchar("description", { length: 500 }),
    externalReference: varchar("external_reference", { length: 128 }),
    returnUrl: text("return_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, string>>().notNull().default({}),
    paymentLinkId: uuid("payment_link_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payment_intents_public_id_uq").on(t.publicId),
    index("payment_intents_org_created_idx").on(t.organizationId, t.createdAt),
    check("payment_intents_amount_ck", sql`${t.amount} > 0`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    organizationId: orgRef(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id),
    provider: varchar("provider", { length: 64 }).notNull(),
    externalId: varchar("external_id", { length: 191 }),
    mode: apiKeyModeEnum("mode").notNull(),
    method: paymentMethodEnum("method").notNull(),
    status: transactionStatusEnum("status").notNull().default("created"),
    amount: money("amount").notNull(),
    currency: currencyEnum("currency").notNull().default("BRL"),
    /** Tarifa e líquido calculados pela tabela contratual vigente no momento da aprovação. */
    feeAmount: money("fee_amount"),
    netAmount: money("net_amount"),
    refundedAmount: money("refunded_amount").notNull().default(0),
    failureReason: text("failure_reason"),
    reconciliationRef: varchar("reconciliation_ref", { length: 191 }),
    /** Bot do Telegram que originou a venda (preenchido pelo motor de fluxos). */
    botId: uuid("bot_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("transactions_bot_idx").on(t.botId, t.status),
    uniqueIndex("transactions_public_id_uq").on(t.publicId),
    uniqueIndex("transactions_provider_external_uq").on(t.provider, t.externalId),
    index("transactions_org_created_idx").on(t.organizationId, t.createdAt),
    index("transactions_org_status_idx").on(t.organizationId, t.status),
    index("transactions_org_status_approved_idx").on(t.organizationId, t.status, t.approvedAt),
    check("transactions_amount_ck", sql`${t.amount} > 0`),
    check("transactions_refunded_ck", sql`${t.refundedAmount} >= 0 AND ${t.refundedAmount} <= ${t.amount}`),
  ],
);

/** Histórico append-only de cada mudança de status de uma transação. */
export const transactionEvents = pgTable(
  "transaction_events",
  {
    id: id(),
    organizationId: orgRef(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    fromStatus: transactionStatusEnum("from_status"),
    toStatus: transactionStatusEnum("to_status").notNull(),
    source: varchar("source", { length: 32 }).notNull(), // api | webhook | poll | reconciliation | admin
    providerEventId: uuid("provider_event_id").references(() => providerEvents.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("transaction_events_txn_idx").on(t.transactionId, t.createdAt)],
);

export const refunds = pgTable(
  "refunds",
  {
    id: id(),
    organizationId: orgRef(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    externalId: varchar("external_id", { length: 191 }),
    amount: money("amount").notNull(),
    currency: currencyEnum("currency").notNull().default("BRL"),
    status: refundStatusEnum("status").notNull().default("requested"),
    reason: text("reason").notNull(),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("refunds_public_id_uq").on(t.publicId),
    index("refunds_txn_idx").on(t.transactionId),
    check("refunds_amount_ck", sql`${t.amount} > 0`),
  ],
);

export const disputes = pgTable(
  "disputes",
  {
    id: id(),
    organizationId: orgRef(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    externalId: varchar("external_id", { length: 191 }),
    status: disputeStatusEnum("status").notNull().default("opened"),
    amount: money("amount").notNull(),
    reason: text("reason"),
    evidenceDueAt: timestamp("evidence_due_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("disputes_org_idx").on(t.organizationId, t.status)],
);

/** Chaves de idempotência por organização e operação. Respostas guardadas por 24h. */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: id(),
    organizationId: orgRef(),
    key: varchar("key", { length: 255 }).notNull(),
    operation: varchar("operation", { length: 64 }).notNull(),
    /** SHA-256 do corpo: a mesma chave com outro corpo é rejeitada (409). */
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("idempotency_org_op_key_uq").on(t.organizationId, t.operation, t.key)],
);

export const paymentLinks = pgTable(
  "payment_links",
  {
    id: id(),
    organizationId: orgRef(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    amount: money("amount").notNull(),
    currency: currencyEnum("currency").notNull().default("BRL"),
    externalReference: varchar("external_reference", { length: 128 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxPayments: integer("max_payments"),
    requiredFields: jsonb("required_fields").$type<string[]>().notNull().default([]),
    returnUrl: text("return_url"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payment_links_public_id_uq").on(t.publicId),
    check("payment_links_amount_ck", sql`${t.amount} > 0`),
  ],
);

/* ─────────────────────────── API e webhooks ─────────────────────────── */

export const apiKeys = pgTable(
  "api_keys",
  {
    id: id(),
    organizationId: orgRef(),
    name: varchar("name", { length: 100 }).notNull(),
    mode: apiKeyModeEnum("mode").notNull(),
    /** Prefixo visível (ex.: dom_live_ab12) para identificação; o resto só existe no momento da criação. */
    prefix: varchar("prefix", { length: 24 }).notNull(),
    /** HMAC-SHA256 da chave com pepper do servidor. */
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("api_keys_hash_uq").on(t.keyHash), index("api_keys_org_idx").on(t.organizationId)],
);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: id(),
    organizationId: orgRef(),
    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().notNull(),
    /** Segredo de assinatura cifrado; exibido uma única vez ao criar. */
    secretEncrypted: text("secret_encrypted").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("webhook_endpoints_org_idx").on(t.organizationId)],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: id(),
    organizationId: orgRef(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id),
    /** evt_… — o receptor usa para deduplicar. */
    eventId: varchar("event_id", { length: 40 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    payload: jsonb("payload").notNull(),
    status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    lastResponseStatus: integer("last_response_status"),
    lastError: text("last_error"),
    durationMs: integer("duration_ms"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("webhook_deliveries_endpoint_event_uq").on(t.endpointId, t.eventId),
    index("webhook_deliveries_due_idx").on(t.status, t.nextAttemptAt),
  ],
);

/* ─────────────────────────── Ledger (se a Dominus mantiver livro próprio) ─────────────────────────── */

export const ledgerAccounts = pgTable(
  "ledger_accounts",
  {
    id: id(),
    organizationId: orgRef(),
    code: varchar("code", { length: 64 }).notNull(), // ex.: receivable_provider, fees, merchant_payable
    currency: currencyEnum("currency").notNull().default("BRL"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("ledger_accounts_org_code_uq").on(t.organizationId, t.code, t.currency)],
);

/**
 * Lançamentos de partidas dobradas. Imutáveis (trigger). Cada `journal_id`
 * soma débitos = créditos. `source_key` torna a contabilização idempotente.
 */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: id(),
    organizationId: orgRef(),
    journalId: uuid("journal_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => ledgerAccounts.id),
    direction: ledgerDirectionEnum("direction").notNull(),
    amount: money("amount").notNull(),
    currency: currencyEnum("currency").notNull().default("BRL"),
    sourceKey: varchar("source_key", { length: 191 }).notNull(),
    reversesEntryId: uuid("reverses_entry_id"),
    description: text("description"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ledger_entries_source_account_dir_uq").on(t.sourceKey, t.accountId, t.direction),
    index("ledger_entries_journal_idx").on(t.journalId),
    check("ledger_entries_amount_ck", sql`${t.amount} > 0`),
  ],
);

/* ─────────────────────────── Produto: gateways, trackeamento, notificações, fluxos ─────────────────────────── */

export const platformGateways = pgTable(
  "platform_gateways",
  {
    id: id(),
    organizationId: orgRef(),
    gatewayKey: varchar("gateway_key", { length: 48 }).notNull(),
    /** inactive | configured | active */
    status: varchar("status", { length: 16 }).notNull().default("inactive"),
    /** AES-256-GCM (v1:iv:tag:dados). Nunca devolvida ao navegador. */
    apiKeyEncrypted: text("api_key_encrypted"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("platform_gateways_org_key_uq").on(t.organizationId, t.gatewayKey)],
);

export const trackingConfigs = pgTable(
  "tracking_configs",
  {
    id: id(),
    organizationId: orgRef(),
    platform: varchar("platform", { length: 24 }).notNull(),
    enabled: boolean("enabled").notNull().default(false),
    /** Pixel ID / token, cifrado. */
    valueEncrypted: text("value_encrypted"),
    eventsSent: integer("events_sent").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("tracking_configs_org_platform_uq").on(t.organizationId, t.platform)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 48 }).notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("notification_prefs_user_key_uq").on(t.userId, t.key)],
);

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }),
  cpf: varchar("cpf", { length: 14 }),
  /** Caminho público em /public/avatars (ex.: /avatars/<arquivo>.png). */
  avatarUrl: varchar("avatar_url", { length: 160 }),
  updatedAt: updatedAt(),
});

export const flows = pgTable(
  "flows",
  {
    id: id(),
    organizationId: orgRef(),
    name: varchar("name", { length: 120 }).notNull(),
    /** basic | advanced */
    kind: varchar("kind", { length: 16 }).notNull().default("basic"),
    /** draft | active */
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    /** Bot do Telegram vinculado (Fase 2). */
    botId: uuid("bot_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("flows_org_idx").on(t.organizationId)],
);

export const flowSteps = pgTable(
  "flow_steps",
  {
    id: id(),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** message | pix | wait_payment | deliver */
    kind: varchar("kind", { length: 24 }).notNull(),
    config: jsonb("config").$type<Record<string, string>>().notNull().default({}),
  },
  (t) => [index("flow_steps_flow_idx").on(t.flowId, t.position)],
);

/** Cada /start recebido por um bot do Telegram da organização (preenchida pela Fase 2). */
export const botStarts = pgTable(
  "bot_starts",
  {
    id: id(),
    organizationId: orgRef(),
    /** Bot do Telegram (Fase 2); sem FK até a tabela de bots existir. */
    botId: uuid("bot_id"),
    telegramUserId: varchar("telegram_user_id", { length: 32 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("bot_starts_org_created_idx").on(t.organizationId, t.createdAt)],
);

/* ─────────────────────────── Telegram, leads, campanhas, eventos ─────────────────────────── */

/** Barramento de eventos de domínio. `dedupe_key` torna a publicação e o consumo idempotentes. */
export const domainEvents = pgTable(
  "domain_events",
  {
    id: id(),
    organizationId: orgRef(),
    type: varchar("type", { length: 48 }).notNull(),
    dedupeKey: varchar("dedupe_key", { length: 191 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    /** pending | done | failed */
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("domain_events_dedupe_uq").on(t.dedupeKey),
    index("domain_events_pending_idx").on(t.status, t.nextAttemptAt),
    index("domain_events_org_created_idx").on(t.organizationId, t.createdAt),
  ],
);

export const bots = pgTable(
  "bots",
  {
    id: id(),
    organizationId: orgRef(),
    telegramBotId: varchar("telegram_bot_id", { length: 32 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    /** AES-256-GCM. Nulo depois de desconectar. */
    tokenEncrypted: text("token_encrypted"),
    /** sha256 do token: impede o mesmo bot em duas contas sem guardar o token em claro. */
    tokenHash: varchar("token_hash", { length: 64 }),
    /** Segredo do header X-Telegram-Bot-Api-Secret-Token (cifrado). */
    webhookSecretEncrypted: text("webhook_secret_encrypted"),
    /** online | offline | paused | disconnected */
    status: varchar("status", { length: 16 }).notNull().default("offline"),
    lastError: text("last_error"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("bots_org_idx").on(t.organizationId, t.status),
    uniqueIndex("bots_token_hash_uq").on(t.tokenHash),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: id(),
    organizationId: orgRef(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "restrict" }),
    telegramId: varchar("telegram_id", { length: 32 }).notNull(),
    firstName: varchar("first_name", { length: 128 }),
    username: varchar("username", { length: 64 }),
    language: varchar("language", { length: 16 }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    hasPaid: boolean("has_paid").notNull().default(false),
    /** O lead bloqueou o bot (Telegram respondeu 403). */
    blocked: boolean("blocked").notNull().default(false),
    /** Payload do /start (código de rastreio, Parte 6). */
    startPayload: varchar("start_payload", { length: 64 }),
    startedAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("leads_bot_telegram_uq").on(t.botId, t.telegramId),
    index("leads_org_started_idx").on(t.organizationId, t.startedAt),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: id(),
    organizationId: orgRef(),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 120 }).notNull(),
    /** all | not_paid | paid | tag */
    audience: varchar("audience", { length: 16 }).notNull(),
    audienceTag: varchar("audience_tag", { length: 48 }),
    text: text("text").notNull(),
    mediaUrl: text("media_url"),
    buttons: jsonb("buttons").$type<{ text: string; url: string }[]>().notNull().default([]),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    /** scheduled | sending | done | cancelled */
    status: varchar("status", { length: 16 }).notNull().default("scheduled"),
    total: integer("total").notNull().default(0),
    sent: integer("sent").notNull().default(0),
    failed: integer("failed").notNull().default(0),
    blocked: integer("blocked").notNull().default(0),
    createdAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("campaigns_org_idx").on(t.organizationId, t.createdAt), index("campaigns_due_idx").on(t.status, t.scheduledAt)],
);

export const campaignDeliveries = pgTable(
  "campaign_deliveries",
  {
    id: id(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "restrict" }),
    /** pending | sent | failed | blocked */
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    error: text("error"),
  },
  (t) => [
    uniqueIndex("campaign_deliveries_uq").on(t.campaignId, t.leadId),
    index("campaign_deliveries_due_idx").on(t.status, t.nextAttemptAt),
  ],
);

/** Execução de um fluxo para um lead. `current_step` é a posição do próximo passo a executar. */
export const flowRuns = pgTable(
  "flow_runs",
  {
    id: id(),
    organizationId: orgRef(),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    botId: uuid("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "restrict" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "restrict" }),
    /** running | waiting_payment | completed | failed | expired | cancelled */
    status: varchar("status", { length: 20 }).notNull().default("running"),
    currentStep: integer("current_step").notNull().default(0),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull().defaultNow(),
    /** Fim da espera do passo "Aguardar pagamento". */
    waitUntil: timestamp("wait_until", { withTimezone: true }),
    /** Transação PIX gerada pelo passo "Gerar PIX" desta execução. */
    transactionId: uuid("transaction_id").references(() => transactions.id),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    // Um lead não pode ter duas execuções ativas do mesmo fluxo (reenvio de /start).
    uniqueIndex("flow_runs_active_uq")
      .on(t.leadId, t.flowId)
      .where(sql`${t.status} in ('running', 'waiting_payment')`),
    index("flow_runs_due_idx").on(t.status, t.nextRunAt),
    index("flow_runs_txn_idx").on(t.transactionId),
    index("flow_runs_org_idx").on(t.organizationId, t.createdAt),
  ],
);

/* ─────────────────────────── Conciliação ─────────────────────────── */

/** Log de depuração de cada chamada ao provedor. Nunca guarda cabeçalhos nem credenciais. */
export const gatewayLogs = pgTable(
  "gateway_logs",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    provider: varchar("provider", { length: 64 }).notNull(),
    /** create_pix | get_status | get_balance | webhook | test_connection */
    operation: varchar("operation", { length: 32 }).notNull(),
    httpMethod: varchar("http_method", { length: 8 }),
    path: varchar("path", { length: 191 }),
    httpStatus: integer("http_status"),
    ok: boolean("ok").notNull(),
    durationMs: integer("duration_ms"),
    request: jsonb("request"),
    response: text("response"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("gateway_logs_provider_idx").on(t.provider, t.createdAt), index("gateway_logs_org_idx").on(t.organizationId, t.createdAt)],
);

export const reconciliationRuns = pgTable(
  "reconciliation_runs",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    provider: varchar("provider", { length: 64 }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    status: reconciliationRunStatusEnum("status").notNull().default("running"),
    sourceFileKey: text("source_file_key"),
    summary: jsonb("summary").$type<Record<string, number>>(),
    startedByUserId: uuid("started_by_user_id").references(() => users.id),
    createdAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [check("reconciliation_period_ck", sql`${t.periodEnd} > ${t.periodStart}`)],
);

export const reconciliationItems = pgTable(
  "reconciliation_items",
  {
    id: id(),
    runId: uuid("run_id")
      .notNull()
      .references(() => reconciliationRuns.id, { onDelete: "cascade" }),
    kind: reconciliationItemKindEnum("kind").notNull(),
    transactionId: uuid("transaction_id").references(() => transactions.id),
    externalId: varchar("external_id", { length: 191 }),
    internalAmount: money("internal_amount"),
    providerAmount: money("provider_amount"),
    internalStatus: varchar("internal_status", { length: 32 }),
    providerStatus: varchar("provider_status", { length: 64 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id),
    resolutionNote: text("resolution_note"),
    createdAt: createdAt(),
  },
  (t) => [index("reconciliation_items_run_kind_idx").on(t.runId, t.kind)],
);

/* ─────────────────────────── Auditoria, notificações, suporte ─────────────────────────── */

/** Append-only (trigger). Nunca guarde segredos, senhas ou dados de cartão em `metadata`. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    actorApiKeyId: uuid("actor_api_key_id").references(() => apiKeys.id),
    action: varchar("action", { length: 96 }).notNull(),
    targetType: varchar("target_type", { length: 64 }),
    targetId: varchar("target_id", { length: 64 }),
    justification: text("justification"),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    correlationId: varchar("correlation_id", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_org_created_idx").on(t.organizationId, t.createdAt),
    index("audit_logs_actor_idx").on(t.actorUserId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id),
    kind: varchar("kind", { length: 64 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt)],
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: id(),
    organizationId: orgRef(),
    openedByUserId: uuid("opened_by_user_id")
      .notNull()
      .references(() => users.id),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
    subject: varchar("subject", { length: 200 }).notNull(),
    status: ticketStatusEnum("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("support_tickets_org_status_idx").on(t.organizationId, t.status)],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: id(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    internal: boolean("internal").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("support_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

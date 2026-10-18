CREATE TYPE "public"."account_type" AS ENUM('individual', 'business');--> statement-breakpoint
CREATE TYPE "public"."api_key_mode" AS ENUM('test', 'live');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('BRL');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('opened', 'evidence_required', 'under_review', 'won', 'lost', 'closed');--> statement-breakpoint
CREATE TYPE "public"."kyc_document_type" AS ENUM('identity_front', 'identity_back', 'selfie', 'proof_of_address', 'articles_of_incorporation', 'cnpj_card', 'representative_authorization', 'other');--> statement-breakpoint
CREATE TYPE "public"."kyc_review_decision" AS ENUM('approve', 'reject', 'request_info', 'suspend', 'request_reassessment');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'in_progress', 'documents_pending', 'under_review', 'additional_info_required', 'approved', 'rejected', 'suspended', 'reassessment_required');--> statement-breakpoint
CREATE TYPE "public"."ledger_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'restricted', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('requires_payment', 'processing', 'succeeded', 'cancelled', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('pix', 'credit_card', 'debit_card', 'boleto');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_item_kind" AS ENUM('matched', 'amount_mismatch', 'status_mismatch', 'missing_internal', 'missing_provider', 'duplicate', 'late_payment');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_run_status" AS ENUM('running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'pending_customer', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('created', 'awaiting_payment', 'processing', 'approved', 'declined', 'cancelled', 'partially_refunded', 'refunded', 'disputed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'succeeded', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"mode" "api_key_mode" NOT NULL,
	"prefix" varchar(24) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"actor_api_key_id" uuid,
	"action" varchar(96) NOT NULL,
	"target_type" varchar(64),
	"target_id" varchar(64),
	"justification" text,
	"ip" "inet",
	"user_agent" text,
	"correlation_id" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(64) NOT NULL,
	"policy_version" varchar(32) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip" "inet"
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"external_id" varchar(191),
	"status" "dispute_status" DEFAULT 'opened' NOT NULL,
	"amount" bigint NOT NULL,
	"reason" text,
	"evidence_due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" varchar(255) NOT NULL,
	"operation" varchar(64) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"locked_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "kyc_status" DEFAULT 'not_started' NOT NULL,
	"account_type" "account_type" NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"external_provider" varchar(64),
	"external_reference" varchar(128),
	"retention_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"type" "kyc_document_type" NOT NULL,
	"storage_key" text NOT NULL,
	"detected_mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"superseded_by_id" uuid,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_documents_size_ck" CHECK ("kyc_documents"."size_bytes" > 0 AND "kyc_documents"."size_bytes" <= 15728640)
);
--> statement-breakpoint
CREATE TABLE "kyc_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"decision" "kyc_review_decision" NOT NULL,
	"from_status" "kyc_status" NOT NULL,
	"to_status" "kyc_status" NOT NULL,
	"justification" text NOT NULL,
	"requested_items" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_reviews_justification_ck" CHECK (length(trim("kyc_reviews"."justification")) >= 10)
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"journal_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" "ledger_direction" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"source_key" varchar(191) NOT NULL,
	"reverses_entry_id" uuid,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_amount_ck" CHECK ("ledger_entries"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"kind" varchar(64) NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "member_status" DEFAULT 'invited' NOT NULL,
	"invited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"name" varchar(200) NOT NULL,
	"account_type" "account_type" NOT NULL,
	"status" "organization_status" DEFAULT 'active' NOT NULL,
	"live_mode_enabled" boolean DEFAULT false NOT NULL,
	"allowed_return_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(320),
	"document" varchar(14),
	"external_reference" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"mode" "api_key_mode" NOT NULL,
	"customer_id" uuid,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_intent_status" DEFAULT 'requires_payment' NOT NULL,
	"description" varchar(500),
	"external_reference" varchar(128),
	"return_url" text,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payment_link_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_intents_amount_ck" CHECK ("payment_intents"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"external_reference" varchar(128),
	"expires_at" timestamp with time zone,
	"max_payments" integer,
	"required_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"return_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_links_amount_ck" CHECK ("payment_links"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"mode" "api_key_mode" NOT NULL,
	"credentials_encrypted" text NOT NULL,
	"credentials_last4" varchar(4),
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(64) NOT NULL,
	"external_event_id" varchar(191) NOT NULL,
	"type" varchar(64) NOT NULL,
	"organization_id" uuid,
	"payload" jsonb NOT NULL,
	"signature_valid" boolean NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"kind" "reconciliation_item_kind" NOT NULL,
	"transaction_id" uuid,
	"external_id" varchar(191),
	"internal_amount" bigint,
	"provider_amount" bigint,
	"internal_status" varchar(32),
	"provider_status" varchar(64),
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"provider" varchar(64) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" "reconciliation_run_status" DEFAULT 'running' NOT NULL,
	"source_file_key" text,
	"summary" jsonb,
	"started_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "reconciliation_period_ck" CHECK ("reconciliation_runs"."period_end" > "reconciliation_runs"."period_start")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"transaction_id" uuid NOT NULL,
	"external_id" varchar(191),
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"status" "refund_status" DEFAULT 'requested' NOT NULL,
	"reason" text NOT NULL,
	"requested_by_user_id" uuid,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_amount_ck" CHECK ("refunds"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(48) NOT NULL,
	"name" varchar(100) NOT NULL,
	"scope" varchar(16) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"mfa_verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"assigned_to_user_id" uuid,
	"subject" varchar(200) NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"from_status" "transaction_status",
	"to_status" "transaction_status" NOT NULL,
	"source" varchar(32) NOT NULL,
	"provider_event_id" uuid,
	"actor_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"external_id" varchar(191),
	"mode" "api_key_mode" NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "transaction_status" DEFAULT 'created' NOT NULL,
	"amount" bigint NOT NULL,
	"currency" "currency" DEFAULT 'BRL' NOT NULL,
	"fee_amount" bigint,
	"net_amount" bigint,
	"refunded_amount" bigint DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"reconciliation_ref" varchar(191),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_ck" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_refunded_ck" CHECK ("transactions"."refunded_amount" >= 0 AND "transactions"."refunded_amount" <= "transactions"."amount")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text NOT NULL,
	"name" varchar(200) NOT NULL,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret_encrypted" text,
	"is_platform_staff" boolean DEFAULT false NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"event_id" varchar(40) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"last_response_status" integer,
	"last_error" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"url" text NOT NULL,
	"events" jsonb NOT NULL,
	"secret_encrypted" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_api_key_id_api_keys_id_fk" FOREIGN KEY ("actor_api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_cases" ADD CONSTRAINT "kyc_cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_case_id_kyc_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."kyc_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_reviews" ADD CONSTRAINT "kyc_reviews_case_id_kyc_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."kyc_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_reviews" ADD CONSTRAINT "kyc_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_customers" ADD CONSTRAINT "payment_customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_customer_id_payment_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."payment_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_run_id_reconciliation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."reconciliation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_started_by_user_id_users_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_provider_event_id_provider_events_id_fk" FOREIGN KEY ("provider_event_id") REFERENCES "public"."provider_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_hash_uq" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_org_idx" ON "api_keys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_hash_uq" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "disputes_org_idx" ON "disputes" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_org_op_key_uq" ON "idempotency_keys" USING btree ("organization_id","operation","key");--> statement-breakpoint
CREATE INDEX "kyc_cases_org_idx" ON "kyc_cases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kyc_cases_status_idx" ON "kyc_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_documents_case_idx" ON "kyc_documents" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "kyc_reviews_case_idx" ON "kyc_reviews" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_org_code_uq" ON "ledger_accounts" USING btree ("organization_id","code","currency");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entries_source_account_dir_uq" ON "ledger_entries" USING btree ("source_key","account_id","direction");--> statement-breakpoint
CREATE INDEX "ledger_entries_journal_idx" ON "ledger_entries" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "org_members_org_user_uq" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "org_members_user_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_public_id_uq" ON "organizations" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_customers_public_id_uq" ON "payment_customers" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "payment_customers_org_idx" ON "payment_customers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_intents_public_id_uq" ON "payment_intents" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "payment_intents_org_created_idx" ON "payment_intents" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_public_id_uq" ON "payment_links" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_key_uq" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_accounts_org_provider_mode_uq" ON "provider_accounts" USING btree ("organization_id","provider","mode");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_dedup_uq" ON "provider_events" USING btree ("provider","external_event_id");--> statement-breakpoint
CREATE INDEX "reconciliation_items_run_kind_idx" ON "reconciliation_items" USING btree ("run_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_public_id_uq" ON "refunds" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "refunds_txn_idx" ON "refunds" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_uq" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_org_status_idx" ON "support_tickets" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "transaction_events_txn_idx" ON "transaction_events" USING btree ("transaction_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_public_id_uq" ON "transactions" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_provider_external_uq" ON "transactions" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "transactions_org_created_idx" ON "transactions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_org_status_idx" ON "transactions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_deliveries_endpoint_event_uq" ON "webhook_deliveries" USING btree ("endpoint_id","event_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_due_idx" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_org_idx" ON "webhook_endpoints" USING btree ("organization_id");
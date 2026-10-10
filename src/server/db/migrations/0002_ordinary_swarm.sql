CREATE TABLE "quotation_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"correlation_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	CONSTRAINT "quotation_status_check" CHECK ("quotations"."status" IN ('issued', 'expired', 'superseded')),
	CONSTRAINT "quotation_expiry_check" CHECK ("quotations"."expires_at" = "quotations"."issued_at" + interval '24 hours')
);
--> statement-breakpoint
CREATE TABLE "rag_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"pipeline_version" varchar(30) NOT NULL,
	"embedding" vector(768),
	"embedding_model" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visitor_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "quotation_versions" ADD CONSTRAINT "quotation_versions_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_chunks" ADD CONSTRAINT "rag_chunks_document_id_catalog_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."catalog_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_version_idx" ON "quotation_versions" USING btree ("quotation_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_session_key_idx" ON "quotations" USING btree ("session_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "quotation_session_expiry_idx" ON "quotations" USING btree ("session_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rag_chunks_document_ordinal_idx" ON "rag_chunks" USING btree ("document_id","ordinal");--> statement-breakpoint
CREATE INDEX "visitor_sessions_expiry_idx" ON "visitor_sessions" USING btree ("expires_at");
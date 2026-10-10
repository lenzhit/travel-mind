CREATE TABLE "admin_sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"actor" varchar(100) NOT NULL,
	"role" varchar(30) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"package_id" uuid NOT NULL,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"status" varchar(30) NOT NULL,
	"approved_by" varchar(100) NOT NULL,
	"source_uri" text NOT NULL,
	"acl" varchar(30) DEFAULT 'public' NOT NULL,
	"language" varchar(10) DEFAULT 'es-PE' NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_document_status" CHECK ("catalog_documents"."status" IN ('approved', 'superseded', 'withdrawn')),
	CONSTRAINT "catalog_document_version_positive" CHECK ("catalog_documents"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_documents" ADD CONSTRAINT "catalog_documents_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_sessions_expiry_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_document_version_idx" ON "catalog_documents" USING btree ("package_id","version");--> statement-breakpoint
CREATE INDEX "catalog_documents_status_idx" ON "catalog_documents" USING btree ("status");--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_price_nonnegative" CHECK ("packages"."base_price_minor" >= 0);--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_duration_positive" CHECK ("packages"."duration_days" > 0);
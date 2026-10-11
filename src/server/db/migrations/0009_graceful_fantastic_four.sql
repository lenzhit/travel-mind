CREATE TABLE "consultation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"correlation_id" uuid NOT NULL,
	"ai_mode" varchar(20) NOT NULL,
	"retrieval_mode" varchar(20) NOT NULL,
	"recommendation_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "consultation_runs_correlation_id_unique" UNIQUE("correlation_id"),
	CONSTRAINT "consultation_runs_count" CHECK ("consultation_runs"."recommendation_count" >= 0 AND "consultation_runs"."recommendation_count" <= 3)
);
--> statement-breakpoint
ALTER TABLE "consultation_runs" ADD CONSTRAINT "consultation_runs_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consultation_runs_pending_idx" ON "consultation_runs" USING btree ("processed_at","created_at");
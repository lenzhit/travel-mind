CREATE TABLE "destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"country" varchar(100) DEFAULT 'Perú' NOT NULL,
	"region" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"price_minor" integer NOT NULL,
	"capacity" integer NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"duration_days" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"base_price_minor" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"inclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"itinerary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "package_variants" ADD CONSTRAINT "package_variants_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_slug_idx" ON "destinations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "destinations_status_idx" ON "destinations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "destinations_region_idx" ON "destinations" USING btree ("region");--> statement-breakpoint
CREATE INDEX "package_variants_package_id_idx" ON "package_variants" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "package_variants_status_idx" ON "package_variants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_slug_idx" ON "packages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "packages_destination_id_idx" ON "packages" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "packages_status_idx" ON "packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "packages_category_idx" ON "packages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "packages_base_price_minor_idx" ON "packages" USING btree ("base_price_minor");--> statement-breakpoint
CREATE INDEX "packages_duration_days_idx" ON "packages" USING btree ("duration_days");
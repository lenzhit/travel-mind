import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
  vector,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * Tabla de Destinos Turísticos
 */
export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    country: varchar("country", { length: 100 }).notNull().default("Perú"),
    region: varchar("region", { length: 100 }).notNull(),
    description: text("description").notNull(),
    imageUrl: text("image_url").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("destinations_slug_idx").on(table.slug),
    index("destinations_status_idx").on(table.status),
    index("destinations_region_idx").on(table.region),
  ]
);

/**
 * Estructura de un día de itinerario
 */
export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

/**
 * Tabla de Paquetes Turísticos
 */
export const packages = pgTable(
  "packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description").notNull(),
    durationDays: integer("duration_days").notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    basePriceMinor: integer("base_price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    inclusions: jsonb("inclusions").$type<string[]>().notNull().default([]),
    exclusions: jsonb("exclusions").$type<string[]>().notNull().default([]),
    itinerary: jsonb("itinerary").$type<ItineraryDay[]>().notNull().default([]),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("packages_slug_idx").on(table.slug),
    index("packages_destination_id_idx").on(table.destinationId),
    index("packages_status_idx").on(table.status),
    index("packages_category_idx").on(table.category),
    index("packages_base_price_minor_idx").on(table.basePriceMinor),
    index("packages_duration_days_idx").on(table.durationDays),
    check("packages_price_nonnegative", sql`${table.basePriceMinor} >= 0`),
    check("packages_duration_positive", sql`${table.durationDays} > 0`),
  ]
);

/**
 * Tabla de Variantes de Paquete
 */
export const packageVariants = pgTable(
  "package_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    priceMinor: integer("price_minor").notNull(),
    capacity: integer("capacity").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("package_variants_package_id_idx").on(table.packageId),
    index("package_variants_status_idx").on(table.status),
  ]
);

/**
 * Relaciones Drizzle
 */
export const destinationsRelations = relations(destinations, ({ many }) => ({
  packages: many(packages),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [packages.destinationId],
    references: [destinations.id],
  }),
  variants: many(packageVariants),
}));

export const packageVariantsRelations = relations(packageVariants, ({ one }) => ({
  package: one(packages, {
    fields: [packageVariants.packageId],
    references: [packages.id],
  }),
}));

export type Destination = typeof destinations.$inferSelect;
export type NewDestination = typeof destinations.$inferInsert;

export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;

export type PackageVariant = typeof packageVariants.$inferSelect;
export type NewPackageVariant = typeof packageVariants.$inferInsert;

export const adminSessions = pgTable("admin_sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  actor: varchar("actor", { length: 100 }).notNull(), role: varchar("role", { length: 30 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("admin_sessions_expiry_idx").on(table.expiresAt)]);
export const catalogDocuments = pgTable("catalog_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  packageId: uuid("package_id").notNull().references(() => packages.id, { onDelete: "restrict" }),
  version: integer("version").notNull(), content: text("content").notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(), status: varchar("status", { length: 30 }).notNull(),
  approvedBy: varchar("approved_by", { length: 100 }).notNull(),
  sourceUri: text("source_uri").notNull(),
  acl: varchar("acl", { length: 30 }).notNull().default("public"),
  language: varchar("language", { length: 10 }).notNull().default("es-PE"),
  approvedAt: timestamp("approved_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("catalog_document_version_idx").on(table.packageId, table.version),
  index("catalog_documents_status_idx").on(table.status),
  check("catalog_document_status", sql`${table.status} IN ('approved', 'superseded', 'withdrawn')`),
  check("catalog_document_version_positive", sql`${table.version} > 0`),
]);
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(), actor: varchar("actor", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  packageId: uuid("package_id").notNull().references(() => packages.id, { onDelete: "restrict" }),
  correlationId: uuid("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const visitorSessions = pgTable("visitor_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).defaultNow().notNull(),
  requestCount: integer("request_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("visitor_sessions_expiry_idx").on(table.expiresAt)]);

export const ragChunks = pgTable("rag_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").notNull().references(() => catalogDocuments.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  content: text("content").notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  pipelineVersion: varchar("pipeline_version", { length: 30 }).notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  embeddingModel: varchar("embedding_model", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("rag_chunks_document_ordinal_idx").on(table.documentId, table.ordinal)]);

export interface QuoteSnapshot {
  packageId: string; packageTitle: string; packageUpdatedAt: string;
  variantId: string | null; variantName: string | null;
  departureDate: string; travelers: number; unitPriceMinor: number;
  subtotalMinor: number; taxesMinor: number; feesMinor: number; discountMinor: number; totalMinor: number;
  currency: "USD"; source: string; pricingPolicy: string;
  availability: "requires_reconfirmation"; requiresApproval: boolean;
  inclusions: string[]; exclusions: string[];
}
export const quotations = pgTable("quotations", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => visitorSessions.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 30 }).notNull().default("issued"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  correlationId: uuid("correlation_id").notNull(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
}, table => [
  uniqueIndex("quotation_session_key_idx").on(table.sessionId, table.idempotencyKey),
  index("quotation_session_expiry_idx").on(table.sessionId, table.expiresAt),
  check("quotation_status_check", sql`${table.status} IN ('issued', 'expired', 'superseded')`),
  check("quotation_expiry_check", sql`${table.expiresAt} = ${table.issuedAt} + interval '24 hours'`),
]);
export const quotationVersions = pgTable("quotation_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  quotationId: uuid("quotation_id").notNull().references(() => quotations.id, { onDelete: "restrict" }),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").$type<QuoteSnapshot>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("quotation_version_idx").on(table.quotationId, table.version)]);

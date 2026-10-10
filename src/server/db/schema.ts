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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

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

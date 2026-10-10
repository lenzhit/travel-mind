import { eq, and, gte, lte, ilike, or, asc, desc, count } from "drizzle-orm";
import { db } from "@/server/db";
import { destinations, packages, packageVariants } from "@/server/db/schema";
import type { PackageQueryInput } from "@/features/catalog/schemas";
import type { PackageListItem, PackageDetail } from "@/features/catalog";

export class PackageRepository {
  /**
   * Busca paquetes con filtros, ordenamiento y paginación en PostgreSQL
   */
  async findPackages(query: PackageQueryInput): Promise<{ items: PackageListItem[]; total: number }> {
    const conditions = [eq(packages.status, "active")];

    // Búsqueda textual por título o descripción
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(or(ilike(packages.title, term), ilike(packages.description, term))!);
    }

    // Filtro por destino
    if (query.destinationId) {
      conditions.push(eq(packages.destinationId, query.destinationId));
    }

    // Filtro por categoría
    if (query.category) {
      conditions.push(eq(packages.category, query.category));
    }

    // Filtro por rango de precio (céntimos enteros)
    if (query.minPriceMinor !== undefined) {
      conditions.push(gte(packages.basePriceMinor, query.minPriceMinor));
    }
    if (query.maxPriceMinor !== undefined) {
      conditions.push(lte(packages.basePriceMinor, query.maxPriceMinor));
    }

    // Filtro por duración
    if (query.durationDays !== undefined) {
      conditions.push(eq(packages.durationDays, query.durationDays));
    }

    const whereClause = and(...conditions);

    // Contar total de registros coincidentes
    const [totalResult] = await db
      .select({ value: count() })
      .from(packages)
      .where(whereClause);
    const total = Number(totalResult?.value ?? 0);

    // Ordenamiento
    const orderDirection = query.sortOrder === "asc" ? asc : desc;
    let orderColumn;
    switch (query.sortBy) {
      case "price":
        orderColumn = orderDirection(packages.basePriceMinor);
        break;
      case "duration":
        orderColumn = orderDirection(packages.durationDays);
        break;
      case "title":
        orderColumn = orderDirection(packages.title);
        break;
      case "createdAt":
      default:
        orderColumn = orderDirection(packages.createdAt);
        break;
    }

    // Paginación
    const offset = (query.page - 1) * query.pageSize;

    // Consulta con join a destinos
    const rows = await db
      .select({
        package: packages,
        destination: destinations,
      })
      .from(packages)
      .innerJoin(destinations, eq(packages.destinationId, destinations.id))
      .where(whereClause)
      .orderBy(orderColumn)
      .limit(query.pageSize)
      .offset(offset);

    const items: PackageListItem[] = rows.map((r) => ({
      ...r.package,
      destination: r.destination,
    }));

    return { items, total };
  }

  /**
   * Obtiene el detalle de un paquete por ID (UUID) o slug, incluyendo destino y variantes activas
   */
  async findByIdOrSlug(idOrSlug: string): Promise<PackageDetail | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const whereCondition = and(
      eq(packages.status, "active"),
      isUuid ? eq(packages.id, idOrSlug) : eq(packages.slug, idOrSlug)
    );

    const rows = await db
      .select({
        package: packages,
        destination: destinations,
      })
      .from(packages)
      .innerJoin(destinations, eq(packages.destinationId, destinations.id))
      .where(whereCondition)
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const pkg = rows[0].package;
    const dest = rows[0].destination;

    // Obtener variantes activas
    const variants = await db
      .select()
      .from(packageVariants)
      .where(and(eq(packageVariants.packageId, pkg.id), eq(packageVariants.status, "active")))
      .orderBy(asc(packageVariants.priceMinor));

    return {
      ...pkg,
      destination: dest,
      variants,
    };
  }

  /**
   * Lista destinos activos para selectores y filtros
   */
  async findActiveDestinations() {
    return db
      .select()
      .from(destinations)
      .where(eq(destinations.status, "active"))
      .orderBy(asc(destinations.name));
  }
}

export const packageRepository = new PackageRepository();

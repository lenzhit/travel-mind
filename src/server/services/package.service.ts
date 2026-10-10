import { packageRepository } from "@/server/repositories/package.repository";
import type { PackageQueryInput } from "@/features/catalog/schemas";
import type { PackageListItem, PackageDetail } from "@/features/catalog";

export class PackageService {
  constructor(private readonly repo = packageRepository) {}

  /**
   * Obtiene la lista paginada y filtrada de paquetes turísticos
   */
  async listPackages(query: PackageQueryInput): Promise<{
    items: PackageListItem[];
    meta: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { items, total } = await this.repo.findPackages(query);
    const totalPages = Math.ceil(total / query.pageSize) || 1;

    return {
      items,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Obtiene el detalle de un paquete por ID o slug
   */
  async getPackageDetail(idOrSlug: string): Promise<PackageDetail | null> {
    return this.repo.findByIdOrSlug(idOrSlug);
  }

  /**
   * Obtiene los destinos activos para filtros
   */
  async listDestinations() {
    return this.repo.findActiveDestinations();
  }
}

export const packageService = new PackageService();

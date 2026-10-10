import React from "react";
import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <aside
      aria-label="Aviso de modo demostración"
      className="bg-primary/95 text-primary-foreground border-b border-primary/20 text-xs py-2 px-4 font-medium transition-colors"
    >
      <div className="container mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Info className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            <strong>MODO DEMOSTRACIÓN ACTIVO (USD 0):</strong> Sistema académico en entorno simulado. No se realizan cobros ni reservas reales con proveedores externos.
          </span>
        </div>
        <div className="text-[11px] opacity-90 hidden sm:inline-block">
          Entorno local • Sin APIs de pago
        </div>
      </div>
    </aside>
  );
}

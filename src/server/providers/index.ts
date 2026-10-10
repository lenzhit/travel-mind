/**
 * Interfaces de Adaptadores de Proveedores Externos / Mock (Presupuesto USD 0)
 * Permite alternar entre implementaciones mock y pruebas de sandbox sin coste.
 */

export interface TravelProvider {
  name: string;
  isMock: boolean;
}

export interface PaymentProvider {
  name: string;
  isMock: boolean;
}

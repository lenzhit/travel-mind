// Consultas reproducibles sobre los seeds locales; no contienen PII ni tarifas inventadas.
export const recommendationEvaluation: {
  message: string;
  expectedSlug?: string;
  forbiddenSlug?: string;
  budgetMinor?: number;
  travelers?: number;
  expectEmpty?: boolean;
}[] = [
  { message: "Quiero visitar Cusco y Machu Picchu sin trekking", expectedSlug: "machu-picchu-magico-valle-sagrado", forbiddenSlug: "montana-colores-laguna-humantay" },
  { message: "Quiero historia y arquitectura en Arequipa", expectedSlug: "ruta-sillar-joyas-coloniales-arequipa" },
  { message: "Quiero playas y tortugas en Máncora", expectedSlug: "escape-costero-mancora-playas-norte" },
  { message: "Quiero cultura en Puno y Titicaca", expectedSlug: "islas-uros-taquile-titicaca" },
  { message: "Cusco y Machu Picchu sin trekking para dos personas", expectedSlug: "machu-picchu-magico-valle-sagrado", forbiddenSlug: "montana-colores-laguna-humantay", travelers: 2, budgetMinor: 130000 },
  { message: "Machu Picchu en Cusco", travelers: 2, budgetMinor: 100, expectEmpty: true },
  { message: "Quiero viajar", expectEmpty: true },
  { message: "Viaje a Japón", expectEmpty: true },
];

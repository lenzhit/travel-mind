import { db, conn } from "./index";
import { destinations, packages, packageVariants } from "./schema";

/**
 * Generador de placeholders SVG locales para destinos de TravelMind (utilidad de respaldo)
 */
export function createDestinationSvgPlaceholder(title: string, subtitle: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#123A63" />
        <stop offset="60%" stop-color="${color}" />
        <stop offset="100%" stop-color="#091E33" />
      </linearGradient>
      <linearGradient id="overlay" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="rgba(18,58,99,0.85)" />
        <stop offset="100%" stop-color="rgba(18,58,99,0.1)" />
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#bg)" />
    <!-- Líneas geométricas de paisaje -->
    <path d="M0 380 Q 200 300 400 360 T 800 320 L 800 500 L 0 500 Z" fill="#0A223B" opacity="0.6" />
    <path d="M0 420 Q 300 350 600 410 T 800 380 L 800 500 L 0 500 Z" fill="#061524" opacity="0.9" />
    <rect width="800" height="500" fill="url(#overlay)" />
    <!-- Textos -->
    <text x="40" y="380" font-family="system-ui, sans-serif" font-size="42" font-weight="bold" fill="#FFFFFF">${title}</text>
    <text x="40" y="420" font-family="system-ui, sans-serif" font-size="20" font-weight="500" fill="#0E8F88">${subtitle}</text>
    <text x="40" y="460" font-family="system-ui, sans-serif" font-size="13" font-weight="bold" fill="#CBD5E1">TRAVELMIND • CATÁLOGO DEMOSTRATIVO</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function runSeed() {
  console.log("Iniciando seed reproducible de catálogo demostrativo...");

  // Limpiar datos existentes en orden inverso por FK
  await db.delete(packageVariants);
  await db.delete(packages);
  await db.delete(destinations);
  console.log("Tablas limpiadas.");

  // 1. Insertar Destinos (con imágenes locales bajo licencias abiertas en public/images/destinations/)
  const destinationData = [
    {
      name: "Cusco y Valle Sagrado",
      slug: "cusco-valle-sagrado",
      country: "Perú",
      region: "Cusco",
      description: "Capital histórica del Imperio Incaico, cuna de maravillas arqueológicas andinas y punto de partida a Machu Picchu.",
      imageUrl: "/images/destinations/cusco-valle-sagrado.jpg",
      status: "active",
    },
    {
      name: "Arequipa y Cañón del Colca",
      slug: "arequipa-colca",
      country: "Perú",
      region: "Arequipa",
      description: "La Ciudad Blanca custodiada por volcanes, rica en gastronomía tradicional y hogar de uno de los cañones más profundos del planeta.",
      imageUrl: "/images/destinations/arequipa-colca.jpg",
      status: "active",
    },
    {
      name: "Puno y Lago Titicaca",
      slug: "puno-titicaca",
      country: "Perú",
      region: "Puno",
      description: "Folclor vivo en el lago navegable más alto del mundo, con milenarias islas flotantes de totora y tradiciones ancestrales.",
      imageUrl: "/images/destinations/puno-titicaca.jpg",
      status: "active",
    },
    {
      name: "Iquitos y Amazonía",
      slug: "iquitos-amazonia",
      country: "Perú",
      region: "Loreto",
      description: "Inmensidad de la selva tropical amazónica, biodiversidad incomparable y navegación por los tributarios del Río Amazonas.",
      imageUrl: "/images/destinations/iquitos-amazonia.jpg",
      status: "active",
    },
    {
      name: "Huaraz y Cordillera Blanca",
      slug: "huaraz-cordillera-blanca",
      country: "Perú",
      region: "Áncash",
      description: "Paraíso del montañismo en los Andes peruanos, con picos nevados sobre los 6000 msnm y lagunas glaciares turquesas.",
      imageUrl: "/images/destinations/huaraz-cordillera-blanca.jpg",
      status: "active",
    },
    {
      name: "Máncora y Playas del Norte",
      slug: "mancora-playas-norte",
      country: "Perú",
      region: "Piura",
      description: "Aguas cálidas todo el año, olas reconocidas para surf, avistamiento de tortugas y atardeceres frente al Pacífico.",
      imageUrl: "/images/destinations/mancora-playas-norte.jpg",
      status: "active",
    },
  ];

  const insertedDestinations = await db
    .insert(destinations)
    .values(destinationData)
    .returning();

  console.log(`Insertados ${insertedDestinations.length} destinos.`);

  const destMap = new Map(insertedDestinations.map((d) => [d.slug, d.id]));

  // 2. Insertar Paquetes Turísticos
  const packagesData = [
    {
      destinationId: destMap.get("cusco-valle-sagrado")!,
      title: "Machu Picchu Mágico & Valle Sagrado",
      slug: "machu-picchu-magico-valle-sagrado",
      description: "Recorrido imprescindible por los principales centros arqueológicos de Pisac, Ollantaytambo y la ciudadela inca de Machu Picchu en tren panorámico.",
      durationDays: 4,
      category: "cultural",
      basePriceMinor: 65000, // USD 650.00
      currency: "USD",
      inclusions: [
        "Traslados desde y hacia el aeropuerto de Cusco",
        "Boleto turístico integral de Cusco y Valle Sagrado",
        "Tickets de tren Expedition/Voyager ida y vuelta",
        "Entrada oficial a Machu Picchu (Circuito clásico)",
        "Guía oficial bilingüe certificado",
        "3 noches de hospedaje con desayuno incluido",
      ],
      exclusions: [
        "Vuelos nacionales e internacionales",
        "Alimentación no especificada",
        "Entrada a la montaña Huayna Picchu",
        "Seguro de viaje personal",
      ],
      itinerary: [
        { day: 1, title: "Llegada a Cusco & City Tour Arqueológico", description: "Recepción en aeropuerto, aclimatación y visita a Sacsayhuamán, Qenqo y Plaza Mayor." },
        { day: 2, title: "Valle Sagrado de los Incas", description: "Visita al mercado y ruinas de Pisac, almuerzo buffet en Urubamba y fortaleza de Ollantaytambo." },
        { day: 3, title: "Maravilla del Mundo: Machu Picchu", description: "Viaje en tren hacia Aguas Calientes, subida en bus y tour guiado de 2.5 horas por la ciudadela inca." },
        { day: 4, title: "Retorno y despedida", description: "Mañana libre para compras de artesanías y traslado al aeropuerto de Cusco." },
      ],
      status: "active",
      variants: [
        { name: "Estándar (Hotel 3★)", priceMinor: 65000, capacity: 15 },
        { name: "Superior (Hotel 4★ & Tren Vistadome)", priceMinor: 89000, capacity: 10 },
        { name: "Privado VIP (Guía exclusivo)", priceMinor: 125000, capacity: 4 },
      ],
    },
    {
      destinationId: destMap.get("cusco-valle-sagrado")!,
      title: "Camino Inca Clásico a Machu Picchu",
      slug: "camino-inca-clasico-machu-picchu",
      description: "La caminata más célebre de Sudamérica: 43 kilómetros de senderos incas originales cruzando pasos de montaña, bosques nubosos y ruinas exclusivas.",
      durationDays: 4,
      category: "aventura",
      basePriceMinor: 89000, // USD 890.00
      currency: "USD",
      inclusions: [
        "Permisos oficiales del Camino Inca",
        "Equipo de campamento completo (carpas dobles y colchonetas)",
        "Porteadores para carga de equipo general y cocina",
        "Cocinero profesional y todas las comidas durante el trekking",
        "Entrada a Machu Picchu y tren de retorno a Ollantaytambo",
      ],
      exclusions: [
        "Bolsa de dormir (disponible en alquiler)",
        "Porteador personal para equipaje privado",
        "Propinas para porteadores y cocinero",
      ],
      itinerary: [
        { day: 1, title: "Km 82 a Huayllabamba", description: "Inicio del sendero en Piscacucho, caminata suave de 12 km junto al río Urubamba." },
        { day: 2, title: "Paso Warmiwañusqa (Mujer Muerta)", description: "Jornada exigente ascendiendo hasta los 4,215 msnm y descenso hacia Pacaymayo." },
        { day: 3, title: "Runkurakay & Wiñay Wayna", description: "Cruce de túneles incas, visita a Sayacmarca y campamento cerca de Wiñay Wayna." },
        { day: 4, title: "Inti Punku y Machu Picchu", description: "Llegada al amanecer por la Puerta del Sol, recorrido de la ciudadela y tren a Cusco." },
      ],
      status: "active",
      variants: [
        { name: "Grupo Compartido (Máx 8 pers)", priceMinor: 89000, capacity: 8 },
        { name: "Privado con Porteador Personal", priceMinor: 135000, capacity: 4 },
      ],
    },
    {
      destinationId: destMap.get("cusco-valle-sagrado")!,
      title: "Montaña de Siete Colores & Laguna Humantay",
      slug: "montana-colores-laguna-humantay",
      description: "Dos expediciones de un día a los paisajes naturales más impactantes de la cordillera del Vilcanota: Vinicunca y el espejo turquesa de Humantay.",
      durationDays: 2,
      category: "aventura",
      basePriceMinor: 22000, // USD 220.00
      currency: "USD",
      inclusions: [
        "Transporte turístico ida y vuelta para ambos días",
        "Desayunos y almuerzos buffet campestres",
        "Bastones de trekking y balón de oxígeno de seguridad",
        "Tickets de ingreso a las comunidades de Mollepata y Cusipata",
      ],
      exclusions: [
        "Alojamiento en Cusco entre excursiones",
        "Alquiler de caballo opcional en ruta",
      ],
      itinerary: [
        { day: 1, title: "Trek a la Laguna Humantay", description: "Ascenso de 2 horas desde Soraypampa hacia los 4,200 msnm al pie del nevado Salkantay." },
        { day: 2, title: "Expedición a Vinicunca (Montaña Arcoíris)", description: "Caminata matutina por el valle altoandino hasta el mirador principal a 5,036 msnm." },
      ],
      status: "active",
      variants: [
        { name: "Estándar Compartido", priceMinor: 22000, capacity: 18 },
        { name: "Servicio Privado Flexible", priceMinor: 38000, capacity: 6 },
      ],
    },
    {
      destinationId: destMap.get("arequipa-colca")!,
      title: "Cañón del Colca & Mirador de Cóndores",
      slug: "canon-colca-mirador-condores",
      description: "Recorrido por la Reserva Nacional de Salinas y Aguada Blanca, pueblos coloniales de Chivay y Yanque, y vuelo de cóndores en la Cruz del Cóndor.",
      durationDays: 3,
      category: "naturaleza",
      basePriceMinor: 34000, // USD 340.00
      currency: "USD",
      inclusions: [
        "Transporte turístico Arequipa - Colca - Arequipa",
        "Boleto turístico oficial del Colca (BTC)",
        "2 noches de hospedaje con desayuno en Chivay",
        "Visita al Mirador de la Cruz del Cóndor",
        "Acceso a baños termales de La Calera",
      ],
      exclusions: ["Almuerzos y cenas no detalladas", "Bebidas y gastos extras"],
      itinerary: [
        { day: 1, title: "De Arequipa a Chivay por Pampa Cañahuas", description: "Avistamiento de vicuñas, cruce del mirador de los Andes (4,910 m) y tarde termal." },
        { day: 2, title: "Cruz del Cóndor & Pueblos Tradicionales", description: "Observación matutina de cóndores andinos y recorrido por Maca y Pinchollo." },
        { day: 3, title: "Caminatas cortas y retorno a Arequipa", description: "Visita a talleres textiles artesanales y regreso panorámico a la Ciudad Blanca." },
      ],
      status: "active",
      variants: [
        { name: "Estándar Chivay", priceMinor: 34000, capacity: 16 },
        { name: "Colca Lodge Spa Relax", priceMinor: 68000, capacity: 6 },
      ],
    },
    {
      destinationId: destMap.get("arequipa-colca")!,
      title: "Ruta del Sillar & Joyas Coloniales de Arequipa",
      slug: "ruta-sillar-joyas-coloniales-arequipa",
      description: "Inmersión arquitectónica e histórica: canteras de piedra volcánica de Añashuayco, Monasterio de Santa Catalina y miradores de Yanahuara y Carmen Alto.",
      durationDays: 2,
      category: "cultural",
      basePriceMinor: 18000, // USD 180.00
      currency: "USD",
      inclusions: [
        "Entrada al Monasterio de Santa Catalina con guía oficial",
        "Tour guiado a las Canteras de Sillar con demostración de canteros",
        "Degustación guiada de picantería arequipeña tradicional",
      ],
      exclusions: ["Alojamiento", "Gastos no especificados"],
      itinerary: [
        { day: 1, title: "Centro Histórico & Monasterio Santa Catalina", description: "Claustros coloniales, Plaza de Armas y cúpula de la Iglesia de la Compañía." },
        { day: 2, title: "Canteras de Añashuayco & Culebrillas", description: "Talla en vivo en roca volcánica y cañón virgen con petroglifos Wari." },
      ],
      status: "active",
      variants: [
        { name: "Tour Estándar", priceMinor: 18000, capacity: 20 },
        { name: "Experiencia Gourmet Privada", priceMinor: 32000, capacity: 6 },
      ],
    },
    {
      destinationId: destMap.get("puno-titicaca")!,
      title: "Islas Flotantes de los Uros & Taquile en Titicaca",
      slug: "islas-uros-taquile-titicaca",
      description: "Navegación en lancha veloz por el Lago Titicaca, visita a las familias de los Uros y convivencia comunitaria en la isla de tejedores de Taquile.",
      durationDays: 2,
      category: "cultural",
      basePriceMinor: 19000, // USD 190.00
      currency: "USD",
      inclusions: [
        "Lancha rápida compartida con chalecos salvavidas",
        "Ingresos a las islas de Uros y Taquile",
        "Almuerzo tradicional trucha a la plancha en Taquile",
        "Guía oficial local en español e inglés",
        "1 noche de hotel en Puno ciudad",
      ],
      exclusions: ["Paseo opcional en balsa tradicional de totora", "Cenas"],
      itinerary: [
        { day: 1, title: "Uros y arribo a Taquile", description: "Comprensión del armado de las islas de totora y navegación hacia Taquile." },
        { day: 2, title: "Cultura textil de Taquile & Retorno a Puno", description: "Demostración del arte textil Patrimonio UNESCO y regreso al puerto." },
      ],
      status: "active",
      variants: [
        { name: "Lancha Rápida Estándar", priceMinor: 19000, capacity: 25 },
        { name: "Pernocte Vivencial en Amantaní", priceMinor: 27000, capacity: 12 },
      ],
    },
    {
      destinationId: destMap.get("puno-titicaca")!,
      title: "Ruta Quechua y Aymara: Sillustani & Capachica",
      slug: "ruta-quechua-aymara-sillustani-capachica",
      description: "Arqueología funeraria en las chullpas de Sillustani sobre la laguna Umayo y turismo rural comunitario en la península de Capachica.",
      durationDays: 3,
      category: "cultural",
      basePriceMinor: 28000, // USD 280.00
      currency: "USD",
      inclusions: [
        "Traslados completos en transporte privado",
        "Entrada al complejo arqueológico de Sillustani",
        "2 noches de hospedaje rural en casa comunitaria de Capachica",
        "Todas las comidas caseras preparadas con productos locales",
      ],
      exclusions: ["Bebidas alcohólicas", "Propinas"],
      itinerary: [
        { day: 1, title: "Puno hacia las Chullpas de Sillustani", description: "Torres funerarias colla e incaicas con puesta de sol sobre Umayo." },
        { day: 2, title: "Comunidad de Llachón en Capachica", description: "Paseos en canoa tradicional, faenas agrícolas y talleres de hilado." },
        { day: 3, title: "Despedida comunitaria y traslado a Juliaca", description: "Desayuno andino y traslado hacia el aeropuerto de Juliaca." },
      ],
      status: "active",
      variants: [
        { name: "Estándar Comunitario", priceMinor: 28000, capacity: 10 },
      ],
    },
    {
      destinationId: destMap.get("iquitos-amazonia")!,
      title: "Aventura en la Selva Amazónica del Río Amazonas",
      slug: "aventura-selva-amazonica-rio-amazonas",
      description: "Estadía en ecolodge selvático, navegación en busca de delfines rosados y grises, caminatas nocturnas para observar fauna y pesca de pirañas.",
      durationDays: 4,
      category: "naturaleza",
      basePriceMinor: 58000, // USD 580.00
      currency: "USD",
      inclusions: [
        "Traslados fluviales ida y vuelta desde el puerto de Iquitos",
        "3 noches en cabaña privada con mosquiteros y baño privado",
        "Pensión completa (desayuno, almuerzo, cena estilo amazónico)",
        "Excursiones diarias guiadas por biólogos locales",
        "Botas de jebe para excursiones en selva inundable",
      ],
      exclusions: ["Vuelos a Iquitos", "Consumos en el bar del lodge"],
      itinerary: [
        { day: 1, title: "Navegación por el Río Amazonas y llegada al Lodge", description: "Búsqueda de delfines y caminata introductoria de flora medicinal." },
        { day: 2, title: "Avistamiento de aves y pesca artesanal", description: "Observación de hoatzines y tucanes al amanecer, y pesca de pirañas." },
        { day: 3, title: "Selva primaria y expedición nocturna", description: "Búsqueda de ranas dardo, tarántulas y caimanes en canoa." },
        { day: 4, title: "Comunidad Yagua y retorno a Iquitos", description: "Intercambio cultural respetuoso y regreso a la ciudad de Iquitos." },
      ],
      status: "active",
      variants: [
        { name: "Cabaña Lodge Estándar", priceMinor: 58000, capacity: 14 },
        { name: "Cabaña Superior con Balcón al Río", priceMinor: 82000, capacity: 8 },
      ],
    },
    {
      destinationId: destMap.get("iquitos-amazonia")!,
      title: "Expedición Reserva Nacional Pacaya Samiria",
      slug: "expedicion-reserva-pacaya-samiria",
      description: "Travesía profunda en la 'Selva de los Espejos': acampe en zonas vírgenes protegidas, avistamiento de manatíes, monos aulladores y anacondas.",
      durationDays: 5,
      category: "aventura",
      basePriceMinor: 125000, // USD 1,250.00
      currency: "USD",
      inclusions: [
        "Permisos oficiales del SERNANP para ingresar a la reserva",
        "Bote fluvial con motor fuera de borda y tripulación local",
        "Carpas impermeables y colchonetas de campamento",
        "Guía guardaparque nativo certificado",
        "Alimentación completa y agua purificada durante 5 días",
      ],
      exclusions: ["Vuelos a Iquitos", "Equipo fotográfico profesional"],
      itinerary: [
        { day: 1, title: "De Iquitos a Nauta y entrada a la cuenca Marañón", description: "Punto de control SERNANP e internamiento en la reserva." },
        { day: 2, title: "Cuenca del Río Yanayacu-Pucate", description: "Reflejos perfectos en aguas negras y avistamiento de paiches gigantes." },
        { day: 3, title: "Campamento profundo en bosque primario", description: "Búsqueda de primates, osos perezosos y aves endémicas." },
        { day: 4, title: "Lagunas interiores y pesca con devolución", description: "Recorrido en canoas a remo para contacto silencioso con la fauna." },
        { day: 5, title: "Navegación de retorno hacia Nauta e Iquitos", description: "Despedida de la reserva y traslado al aeropuerto de Iquitos." },
      ],
      status: "active",
      variants: [
        { name: "Expedición en Campamento Rústico", priceMinor: 125000, capacity: 6 },
        { name: "Crucero Boutique Fluvial", priceMinor: 210000, capacity: 12 },
      ],
    },
    {
      destinationId: destMap.get("huaraz-cordillera-blanca")!,
      title: "Laguna 69 & Parque Nacional Huascarán",
      slug: "laguna-69-parque-huascaran",
      description: "Clásica aclimatación andina en el Callejón de Huaylas con caminatas hacia la deslumbrante Laguna 69 bajo el pico nevado Chacraraju.",
      durationDays: 3,
      category: "aventura",
      basePriceMinor: 24000, // USD 240.00
      currency: "USD",
      inclusions: [
        "Transporte turístico local desde Huaraz",
        "Boleto oficial de ingreso al Parque Nacional Huascarán",
        "Guía oficial de montaña AGMP / UIAGM",
        "Desayuno campestre y box lunch energético",
      ],
      exclusions: ["Alojamiento en Huaraz", "Cenas", "Alquiler de bastones"],
      itinerary: [
        { day: 1, title: "Aclimatación: Laguna Llanganuco", description: "Paseo por las lagunas Chinancocha y Orconcocha con vistas al Huascarán." },
        { day: 2, title: "Trek a la Laguna 69", description: "Ascenso exigente de 3.5 horas hasta la laguna a 4,600 msnm." },
        { day: 3, title: "Monumento Arqueológico Chavín de Huántar", description: "Túneles milenarios subterráneos y Cabeza Clava de la cultura Chavín." },
      ],
      status: "active",
      variants: [
        { name: "Grupo Compartido", priceMinor: 24000, capacity: 15 },
        { name: "Privado Personalizado", priceMinor: 42000, capacity: 4 },
      ],
    },
    {
      destinationId: destMap.get("huaraz-cordillera-blanca")!,
      title: "Trek Santa Cruz: Cordillera Blanca",
      slug: "trek-santa-cruz-cordillera-blanca",
      description: "El circuito de trekking más prestigioso de la cordillera blanca: 50 km cruzando el paso Punta Unión a 4,750 msnm rodeado de glaciares.",
      durationDays: 4,
      category: "aventura",
      basePriceMinor: 49000, // USD 490.00
      currency: "USD",
      inclusions: [
        "Guía de montaña titulado",
        "Arrieros y burros para transporte de mochilas y víveres",
        "Carpas de alta montaña cuatro estaciones y carpa comedor",
        "Todas las comidas calientes cocinadas en campamento",
        "Transporte ida desde Huaraz a Vaquería y retorno desde Cashapampa",
      ],
      exclusions: ["Bolsa de dormir -10°C", "Seguro de rescate en montaña"],
      itinerary: [
        { day: 1, title: "Huaraz a Vaquería y campamento Paria", description: "Paso de Portachuelo en vehículo y caminata suave de aclimatación." },
        { day: 2, title: "Paso Punta Unión (4,750 m) a Taullipampa", description: "Vista panorámica del Taulliraju, Alpamayo y lagunas glaciares." },
        { day: 3, title: "Quebrada Santa Cruz a Llamacorral", description: "Descenso largo por el valle de arenas y bosques de queñuales." },
        { day: 4, title: "Cashapampa y retorno a Huaraz", description: "Últimas 3 horas de marcha y transporte de vuelta a Huaraz." },
      ],
      status: "active",
      variants: [
        { name: "Servicio Expedición Estándar", priceMinor: 49000, capacity: 10 },
      ],
    },
    {
      destinationId: destMap.get("mancora-playas-norte")!,
      title: "Escape Costero: Playas de Máncora & Nado con Tortugas",
      slug: "escape-costero-mancora-playas-norte",
      description: "Sol, descanso y gastronomía marina: disfrute de la playa en Máncora, tour marítimo en Los Órganos para nadar con tortugas verdes y atardeceres en Vichayito.",
      durationDays: 4,
      category: "relax",
      basePriceMinor: 42000, // USD 420.00
      currency: "USD",
      inclusions: [
        "3 noches de hotel frente al mar con desayuno",
        "Tour marítimo en lancha y nado guiado con tortugas marinas",
        "Traslados desde el aeropuerto de Talara o Tumbes hacia el hotel",
        "Clase demostrativa de ceviche norteño con pesca del día",
      ],
      exclusions: ["Vuelos aéreos", "Alquiler de tablas de surf"],
      itinerary: [
        { day: 1, title: "Llegada a Máncora & Check-in playero", description: "Recepción y bienvenida tropical con cóctel de frutas locales." },
        { day: 2, title: "Nado con Tortugas en El Ñuro", description: "Visita al muelle artesanal y experiencia segura de nado con fauna marina." },
        { day: 3, title: "Día libre en Playa Vichayito & Clase de cocina", description: "Relax frente a las olas y preparación de ceviche y tiraditos." },
        { day: 4, title: "Mañana de playa y retorno", description: "Check-out y traslado al aeropuerto." },
      ],
      status: "active",
      variants: [
        { name: "Habitación Vista al Jardín", priceMinor: 42000, capacity: 10 },
        { name: "Suite Frente al Mar", priceMinor: 69000, capacity: 6 },
      ],
    },
    {
      destinationId: destMap.get("cusco-valle-sagrado")!,
      title: "Gran Expedición Gastronómica & Cultural Andina",
      slug: "gran-expedicion-gastronomica-cultural-andina",
      description: "Exploración de la biodiversidad culinaria de los Andes: degustación de papas nativas en Moray, chicha de jora, clases con chefs cusqueños y cena gourmet.",
      durationDays: 5,
      category: "gastronomico",
      basePriceMinor: 110000, // USD 1,100.00
      currency: "USD",
      inclusions: [
        "4 noches en hotel boutique 4 estrellas",
        "Menú degustación de 8 pasos en restaurante de autor",
        "Tour a las salineras de Maras y andenes circulares de Moray",
        "Ticket de tren de lujo y visita privada a Machu Picchu",
        "Todas las degustaciones guiadas por sommelier andino",
      ],
      exclusions: ["Vuelos", "Bebidas no contempladas en maridajes"],
      itinerary: [
        { day: 1, title: "Cusco: Mercado San Pedro y cocina criolla", description: "Cata de frutas de los valles y cena de bienvenida." },
        { day: 2, title: "Laboratorio agrícola de Moray & Salineras", description: "Explicación de microclimas y almuerzo campestre de altura." },
        { day: 3, title: "Machu Picchu con tren de categoría superior", description: "Servicio premium con almuerzo gourmet a bordo." },
        { day: 4, title: "Comunidades de Chinchero y cacao chuncho", description: "Taller de chocolate andino y técnicas textiles con tintes orgánicos." },
        { day: 5, title: "Brunch andino y despedida", description: "Despedida y transfer privado al aeropuerto." },
      ],
      status: "active",
      variants: [
        { name: "Experiencia Gourmet Parejas", priceMinor: 110000, capacity: 8 },
        { name: "Exclusivo Chef Privado", priceMinor: 175000, capacity: 4 },
      ],
    },
    {
      destinationId: destMap.get("cusco-valle-sagrado")!,
      title: "Gran Travesía Andina de Lujo (Cusco & Arequipa)",
      slug: "gran-travesia-andina-de-lujo-cusco-arequipa",
      description: "Recorrido integral premium de 8 días enlazando Cusco, el Valle Sagrado, Machu Picchu, el Cañón del Colca y los conventos de Arequipa.",
      durationDays: 8,
      category: "cultural",
      basePriceMinor: 260000, // USD 2,600.00 (Excede USD 2 000 para control HITL en fases posteriores)
      currency: "USD",
      inclusions: [
        "7 noches en hoteles 5 estrellas miembros de cadenas exclusivas",
        "Vehículo privado de lujo con chófer y guía permanente",
        "Todos los boletos turísticos, tren Hiram Bingham a Machu Picchu",
        "Pensión completa en restaurantes galardonados",
        "Seguro médico integral premium incluido",
      ],
      exclusions: ["Vuelos internacionales"],
      itinerary: [
        { day: 1, title: "Llegada VIP a Cusco", description: "Recepción personalizada y cóctel de altura." },
        { day: 2, title: "Valle Sagrado exclusivo", description: "Acceso temprano a centros arqueológicos." },
        { day: 3, title: "Machu Picchu en tren Hiram Bingham", description: "Gourmet dining a bordo y visita guiada privada." },
        { day: 4, title: "Ruta del Sol hacia el Altiplano", description: "Andahuaylillas, Raqchi y Pucará con almuerzo andino." },
        { day: 5, title: "Descenso al Cañón del Colca", description: "Arribo a Colca Lodge y tarde en aguas termales privadas." },
        { day: 6, title: "Cruz del Cóndor y traslado a Arequipa", description: "Observación de cóndores y arribo a Arequipa." },
        { day: 7, title: "Arequipa histórica y arquitectura sillar", description: "Cata de pisco y visita nocturna privada a Santa Catalina." },
        { day: 8, title: "Despedida en Arequipa", description: "Desayuno en terraza con vista al volcán Misti y traslado." },
      ],
      status: "active",
      variants: [
        { name: "Paquete Todo Incluido Luxury", priceMinor: 260000, capacity: 4 },
      ],
    },
  ];

  for (const pkg of packagesData) {
    const { variants, ...pkgInsert } = pkg;
    const [insertedPkg] = await db.insert(packages).values(pkgInsert).returning();

    if (variants && variants.length > 0) {
      await db.insert(packageVariants).values(
        variants.map((v) => ({
          packageId: insertedPkg.id,
          name: v.name,
          priceMinor: v.priceMinor,
          capacity: v.capacity,
          status: "active",
        }))
      );
    }
  }

  console.log(`Insertados ${packagesData.length} paquetes con sus respectivas variantes.`);
  console.log("Seed completado exitosamente.");
}

// Ejecución directa desde CLI
if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  runSeed()
    .then(async () => {
      await conn.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Error al ejecutar seed:", err);
      await conn.end();
      process.exit(1);
    });
}

# TravelMind — Atribución de Recursos Visuales

> Última actualización: 2026-10-10.
> En cumplimiento estricto de la política de presupuesto cero (USD 0) y los estándares de licenciamiento abierto establecidos en `AGENTS.md` y `docs/cost-matrix.md`, todas las fotografías utilizadas en TravelMind son de acceso libre, verificadas bajo licencias abiertas compatibles (Creative Commons / Dominio Público), autoalojadas localmente en `public/images/destinations/` y documentadas con su respectiva autoría y fuente.

---

## Catálogo de Imágenes de Destinos

| Destino | Archivo local | Obra / Título original | Autor / Artista | Licencia | Fuente / Enlace Wikimedia Commons |
|---|---|---|---|---|---|
| **Cusco y Valle Sagrado** | `/images/destinations/cusco-valle-sagrado.jpg` | *Machu Picchu with Huayna Picchu Pérou (9)* | PIERRE ANDRE LECLERCQ | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Machu_Picchu_with_Huayna_Picchu_P%C3%A9rou_(9).jpg) |
| **Arequipa y Cañón del Colca** | `/images/destinations/arequipa-colca.jpg` | *Mirador Cruz del Cóndor en Colca - Arequipa* | Alexvillegas | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mirador_Cruz_del_C%C3%B3ndor_en_Colca_-_Arequipa.jpg) |
| **Puno y Lago Titicaca** | `/images/destinations/puno-titicaca.jpg` | *Islas flotantes de los Uros, Lago Titicaca, Perú, 2015-08-01, DD 25* | Diego Delso (Poco a poco) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Islas_flotantes_de_los_Uros,_Lago_Titicaca,_Per%C3%BA,_2015-08-01,_DD_25.JPG) |
| **Iquitos y Amazonía** | `/images/destinations/iquitos-amazonia.jpg` | *Amazonas, Iquitos - Leticia, Kolumbien (11472506936)* | M M (Flickr: Padmanaba01) | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Amazonas,_Iquitos_-_Leticia,_Kolumbien_(11472506936).jpg) |
| **Huaraz y Cordillera Blanca** | `/images/destinations/huaraz-cordillera-blanca.jpg` | *Laguna 69, Yungay - Huaraz - Perú* | Christian Cruzado | [CC BY 2.0](https://creativecommons.org/licenses/by-2.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Laguna_69,_Yungay_-_Huaraz_-_Per%C3%BA.jpg) |
| **Máncora y Playas del Norte** | `/images/destinations/mancora-playas-norte.jpg` | *Mancora playa* | Charles Gadbois | [CC BY 3.0](https://creativecommons.org/licenses/by-3.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mancora_playa.JPG) |

---

## Características de Almacenamiento y Optimización

- **Formato:** JPEG progresivo optimizado para web.
- **Resolución estándar:** 1280 píxeles de ancho (manteniendo ratio de aspecto 4:3 / 3:2 / 16:9).
- **Peso promedio por imagen:** ~220 KB a 450 KB (total del paquete: ~2.0 MB).
- **Ejecución local / Sin internet:** Las imágenes residen dentro del árbol estático de Next.js (`public/images/destinations/`), permitiendo una experiencia de demostración 100% offline sin peticiones externas hacia servidores de terceros.
- **Fallback:** El proyecto conserva el generador vectorial SVG determinista en `src/server/db/seed.ts` para entornos donde las imágenes no estén disponibles o para pruebas automatizadas.

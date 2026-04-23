# Decisiones Técnicas

## Enfoque general

El objetivo fue construir una solución de calidad de producción - código limpio y funcional con buenos patrones, sin abstracciones innecesarias. Cada funcionalidad agregada tiene una justificación concreta.

### Por qué esta solución va más allá de los requisitos mínimos

**Una nota de contexto:** Tengo experiencia laboral en desarrollo de software, pero no con NestJS ni React específicamente — esos no son los stacks que he usado en entornos profesionales. Mi background incluye Angular, donde los decoradores, la inyección de dependencias y los pipes se mapean directamente a NestJS, lo que hizo que el framework fuera accesible. En el lado de React, he construido proyectos fuera de un contexto profesional. La calidad de esta entrega viene de aplicar fundamentos construidos en experiencia laboral real — contratos tipados, arquitectura en capas, disciplina de testing — transferidos de forma deliberada a un stack nuevo. Esa brecha también es lo que hace que este rol sea genuinamente interesante: hay margen real de crecer en este ecosistema. Investigué el plan de crecimiento de Sundevs antes de aplicar y estoy completamente alineado con él — esta no es una posición de respaldo, es una decisión deliberada.

La prueba técnica pedía: un endpoint NestJS que calcule un puntaje de Hype, y un frontend React que muestre los resultados. La solución entregada incluye además i18n, tema oscuro/claro, Docker, CI, Swagger, skeleton loaders y efectos de animación.

Esta fue una decisión deliberada, y viene con una advertencia consciente de sí misma.

**La justificación de cada adición:**

| Feature | Por qué se agregó |
|---|---|
| Query param `?lang=es\|en` + react-i18next | Sundevs opera en un contexto bilingüe. Internacionalizar tanto las fechas de la respuesta del API como los textos de la UI es un requisito realista, no hipotético. |
| Tema oscuro/claro con design tokens CSS | Los design tokens son la decisión arquitectónica correcta para cualquier UI que necesite temas — hacen que cambiar colores en el futuro sea una edición de una línea. El toggle en sí tardó minutos una vez que existía el sistema de tokens. |
| Docker + docker-compose | La prueba pide "correr la app." Docker garantiza que corre de forma idéntica en cualquier máquina, incluyendo la del evaluador. Sin él, "funciona en mi máquina" es la única garantía. |
| Build multi-stage con nginx | Un contenedor con `vite preview` no es apropiado para producción. Si Docker ya está en el scope, hacerlo correctamente no cuesta casi nada extra. |
| GitHub Actions CI | Dos jobs, 30 líneas de YAML. Si el repo está en GitHub, un pipeline que corre tests en cada push es una expectativa de base, no un extra. |
| Swagger docs | NestJS genera esto desde los decoradores existentes con una sola llamada a `DocumentBuilder`. El costo fue casi cero; el beneficio para el evaluador que revisa el API es real. |
| Skeleton loaders + fallback de imagen | Los datos mock usan URLs de placeholder que fallan con errores SSL. Sin fallbacks, la app se ve rota al cargar. Estos no son polish — son corrección funcional. |
| Confetti + animación de contador | Estas son las únicas features genuinamente opcionales. Se agregaron al final, después de cumplir todos los requisitos funcionales y de calidad, y están aisladas en dos hooks pequeños que pueden eliminarse sin tocar ninguna lógica de negocio. |

**La advertencia consciente:**

Esta solución está sobre-ingenieriada respecto a los requisitos pedidos, y soy consciente de ello. Un JSON estático de 50 items no necesita i18n, Docker, un pipeline de CI ni un hook de confetti. Lo sé.

La razón honesta por la que se construyó así: una prueba técnica es uno de los pocos contextos donde controlo completamente el scope y el tiempo. Usé esa libertad deliberadamente para mostrar el nivel al que puedo llegar, no lo que entregaría bajo un deadline de un día. En un sprint real, con tickets, estimaciones y un equipo esperando mi output, la decisión correcta es entregar el núcleo limpio y proponer mejoras en la retro — no agregarlas de forma unilateral.

La señal que quisiera que un evaluador tomara de esto no es "esta persona sobre-construye todo." Es: "esta persona tiene un techo, sabe dónde está la línea, y eligió cruzarla aquí de forma consciente." El DECISIONS.md existe precisamente para mostrar que los tradeoffs fueron razonados, no accidentales — incluyendo los que fueron demasiado lejos.

---

## Arquitectura

Ambos proyectos viven en un monorepo por simplicidad, pero son desplegables de forma independiente. No existe un paquete compartido entre backend y frontend — a esta escala, esa abstracción costaría más de lo que aporta.

```
test_hype_billboard/
├── backend/     ← API NestJS
├── frontend/    ← SPA React + Vite
├── skills/      ← Definiciones de skills para agentes IA
└── docker-compose.yml
```

### Estructura interna por feature

Ambos proyectos siguen una organización **por funcionalidad**, no por tipo de archivo. Esto evita que a medida que el proyecto crezca, los archivos de un mismo dominio queden dispersos en carpetas genéricas (`hooks/`, `components/`, `services/`).

**Frontend:**
```
src/
├── features/
│   └── billboard/       ← todo lo relacionado a la cartelera
│       ├── components/
│       ├── hooks/
│       └── types.ts
├── shared/
│   └── i18n/            ← recursos compartidos entre features
└── App.tsx
```

**Backend:**
```
src/
├── videos/              ← feature principal
│   ├── __tests__/
│   ├── dto/
│   ├── videos.controller.ts
│   └── videos.service.ts
├── health/
└── common/              ← interceptors y filtros reutilizables
```

---

## Strictness de TypeScript

### `@typescript-eslint/no-explicit-any: error` — aplicado, no desactivado

La regla ESLint `@typescript-eslint/no-explicit-any` está configurada en `'error'` tanto en el backend como en el frontend. Desactivarla (con `'off'`) es un atajo común que oculta problemas de tipado en vez de resolverlos.

Tres lugares en el código requirieron manejo explícito de `any`:

**1. `JSON.parse()` en `VideosService`**

`JSON.parse()` siempre retorna `any` en TypeScript — por diseño, porque TypeScript no puede saber en tiempo de compilación qué estructura tendrá un archivo JSON en disco. La solución no es suprimir el error sino definir la forma esperada y castear explícitamente:

```ts
interface MockDataFile {
  items: RawVideo[];
}

private readonly items: RawVideo[] = (
  JSON.parse(fs.readFileSync(..., 'utf-8')) as MockDataFile
).items;
```

Este es un cast informado, no a ciegas. La interfaz `RawVideo` documenta exactamente qué campos se esperan de cada item en los datos mock de YouTube. Si el archivo no coincide con esa forma, el error aparece en el punto de uso — no silenciosamente.

**2. `context.switchToHttp().getRequest()` en `LoggingInterceptor`**

El `getRequest()` de NestJS retorna `any` porque el framework soporta múltiples protocolos de transporte (HTTP, WebSockets, gRPC). El fix es pasar el tipo esperado como genérico:

```ts
const req = context.switchToHttp().getRequest<Request>();
```

`Request` es el tipo `Request` de Express. Ahora `method` y `url` están correctamente tipados.

**3. Callback de `@Transform` en `GetVideosDto`**

El parámetro `value` en el decorador `@Transform` de class-transformer está tipado como `any` en su API interna. El fix es anotarlo explícitamente:

```ts
@Transform(({ value }: { value: string }) => parseInt(value, 10))
```

En los tres casos la solución fue resolver la brecha de tipado, no desactivar la regla.

---

## Decisiones del Backend

### Estructura de módulos NestJS — plana, no profunda
Un único `VideosModule` con un controller y un service. Sin repositorios, sin capa de casos de uso, sin objetos de dominio. La fuente de datos es un archivo JSON estático — agregar esas capas sería ceremonia sin beneficio.

**Tradeoff:** si la fuente cambia a una base de datos real, habría que agregar una capa de repositorio. Aceptable para el alcance actual.

### Lectura del JSON una sola vez al arrancar
El archivo se lee de forma síncrona y se parsea **una única vez**, cuando la clase `VideosService` se instancia al iniciar la aplicación. El resultado se almacena en un campo privado readonly y se reutiliza en cada request:

```ts
private readonly items: RawVideo[] = (
  JSON.parse(fs.readFileSync('mock-youtube-api.json', 'utf-8')) as MockDataFile
).items;
```

Esto evita tocar el sistema de archivos en cada request. Como los datos son estáticos, no hay razón para releer el archivo — el contenido nunca cambiará entre requests.

El **CacheModule en memoria (TTL: 60s)** agrega una segunda capa: incluso el cómputo en memoria (cálculo de hype, ordenamiento, formateo de fechas) se omite para requests idénticos repetidos dentro de la ventana del TTL. Con datos completamente estáticos el TTL es en gran medida simbólico, pero establece el patrón correcto para cuando la fuente de datos se vuelva dinámica.

**Tradeoff:** si el archivo JSON se actualizara en runtime (ej. un cron job que lo refresca desde YouTube), el servicio seguiría sirviendo datos desactualizados hasta que el proceso se reinicie. La solución sería reemplazar la inicialización del campo de clase con una re-lectura programada. No aplica aquí porque el archivo es parte del artefacto del build.

### Sin librerías de fechas (restricción explícita)
La función `getRelativeDate` maneja: ahora mismo / días / semanas / meses / años, con soporte para español e inglés, usando solo APIs nativas de `Date`.

**Tradeoff:** casos borde como años bisiestos en el cálculo de meses son aproximados (meses de 30 días). Aceptable para texto de visualización.

### i18n via query param (`?lang=es|en`)
En lugar de auto-detectar el idioma por headers, el idioma se pasa explícitamente desde el cliente. Esto hace la API stateless y cache-friendly — la misma URL siempre devuelve el mismo resultado.

**Tradeoff:** el cliente debe manejar su propio estado de idioma y re-fetchear al cambiar. Es la decisión correcta para una API cacheable.

### Envelope de respuesta
Todas las respuestas siguen `{ data, meta, status }`. Da a los consumidores un contrato consistente — el shape de error coincide con el shape de éxito.

---

## Decisiones del Frontend

### Vite + React (sin Next.js)
El requerimiento es un consumidor puro de la API NestJS sin SSR, routing ni SEO. Vite es más rápido para desarrollar y produce un bundle más pequeño que CRA.

### react-i18next para strings de UI
La interfaz tiene dos idiomas (ES/EN). `react-i18next` es el estándar de la industria para i18n en React. El language switcher re-fetchea la API con `?lang=en|es` para que las fechas también cambien de idioma — la experiencia es consistente de punta a punta.

### La Joya de la Corona siempre visible, sin importar el sort
Cuando se ordena por fecha, la Joya de la Corona (mayor hype) puede no estar en la posición #1. La decisión fue **mostrarla siempre primero y destacada**, independientemente del sort. Esto respeta la user story: "el video con mayor hype debe destacar".

**Tradeoff:** rompe el orden estricto en la capa visual. El sort aplica a todas las demás cards. Una alternativa sería quitar el highlight al ordenar por fecha, pero era peor UX.

### Nginx como servidor web en producción (Docker)

Usar `vite preview` o `npx serve` es un atajo común al contenerizar el frontend, pero ninguno es apropiado para producción: no tienen cabeceras de caché para assets estáticos ni routing correcto para SPAs.

El Dockerfile del frontend usa un **build en dos etapas**:

1. **Etapa builder** (`node:20-alpine`): ejecuta `npm ci` + `vite build`. Produce un `dist/` optimizado con nombres de archivo hasheados (`main.a3f21b.js`).
2. **Etapa de producción** (`nginx:alpine`): copia solo el `dist/` a una imagen nginx. Sin Node.js, sin código fuente, sin `node_modules` en la imagen final — el contenedor pesa ~25MB.

El `nginx.conf` completo con explicación línea por línea:

```nginx
server {
  listen 80;
  # Le dice a nginx en qué puerto aceptar conexiones dentro del contenedor.
  # docker-compose mapea el puerto 80 del host → puerto 80 del contenedor.

  root /usr/share/nginx/html;
  # El directorio donde nginx busca los archivos a servir.
  # Es exactamente donde el Dockerfile copia la carpeta dist/ de Vite.

  index index.html;
  # Archivo por defecto cuando se solicita un directorio (ej. GET /).

  location / {
    try_files $uri $uri/ /index.html;
    # Para cada request, nginx intenta tres cosas en orden:
    #   1. $uri        → busca un archivo exacto (ej. /assets/logo.png)
    #   2. $uri/       → busca un directorio con índice (raramente usado aquí)
    #   3. /index.html → cae al punto de entrada de React
    # Sin esto, un refresh en /dashboard devolvería un 404 porque no existe
    # ningún archivo físico llamado "dashboard" en disco — React Router
    # maneja esa ruta del lado del cliente, pero solo después de que se
    # sirva index.html.
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    # Coincide con cualquier request cuya ruta termine con una de estas
    # extensiones. El ~* hace el match case-insensitive.

    expires 1y;
    # Establece el header Expires 1 año en el futuro.
    # Los navegadores no volverán a solicitar estos archivos hasta entonces.

    add_header Cache-Control "public, immutable";
    # public    → la respuesta puede ser cacheada por cualquier caché
    #             intermedio (CDN, proxy).
    # immutable → le dice al navegador que el contenido del archivo nunca
    #             cambiará, por lo que ni siquiera debe enviar una petición
    #             condicional (If-None-Match) durante el año de vigencia.
    # Esto es seguro porque Vite agrega un hash al nombre de cada archivo
    # (ej. index-DpKQQgNn.js). Un nuevo build genera un nuevo hash → nueva
    # URL → la caché se invalida automáticamente. URL vieja = contenido
    # viejo, siempre.
  }
}
```

**Tradeoff:** nginx agrega un paso al modelo mental local — los desarrolladores corren `npm run dev` localmente pero el contenedor Docker usa nginx. La alternativa (`vite preview`) es más simple pero elimina la capa de caché, que es una regresión de rendimiento significativa para visitas repetidas.

### CSS Modules sobre styled-components o Tailwind
Los CSS Modules mantienen estilos encapsulados sin un plugin de build o costo en runtime. Para una prueba técnica autocontenida, CSS plano con modules es más legible y portable.

---

## Patrones considerados e intencionalmente no aplicados

### Husky (git hooks para linting y tests)

Husky ejecuta scripts en eventos de git (`pre-commit`, `pre-push`) para forzar que el linter y los tests pasen antes de que un commit llegue al repositorio. Se consideró y se descartó deliberadamente.

**Por qué no:** Husky resuelve un problema de equipo — evitar que múltiples desarrolladores hagan commit de código que rompe el linter o los tests. En un proyecto de un solo desarrollador esa validación no aporta nada: el único que hace commit eres tú, y la disciplina de correr `npm test` antes de commitear es personal, no estructural.

Más importante: Husky puede ser bypasseado con `git commit --no-verify`. No es una garantía de confiabilidad — es una validación débil. El pipeline de CI en `.github/workflows/ci.yml` ofrece la misma garantía sin posibilidad de bypass: cada push a `main` corre `tsc`, `eslint`, `npm test` y `npm run build` en un entorno limpio. Eso no se puede saltar.

**Cuándo tiene sentido:** en un repo de equipo con múltiples contribuidores, Husky (combinado con `lint-staged` para lintear solo los archivos modificados) es una primera línea de defensa válida. Detecta problemas localmente antes de que lleguen al CI, reduciendo runs innecesarios del pipeline.

---

### Patrón Facade en la capa de datos

El patrón Facade coloca una interfaz simplificada frente a un subsistema complejo. Se consideró para envolver la estructura cruda del JSON de YouTube detrás de una capa de datos más limpia.

El `VideosService` ya actúa como una facade informal: `getVideos()` oculta la complejidad de leer el archivo, parsear los campos crudos de `statistics` y `snippet`, calcular el hype, formatear fechas, marcar la crown, ordenar y cortar — todo detrás de una sola llamada. El controller no sabe nada de nada de eso.

**Por qué no se creó una clase Facade formal:** el "subsistema" aquí es un archivo JSON estático, no una API externa compleja con autenticación, paginación y estados de error. Introducir una clase `YouTubeDataFacade` agregaría una capa de indirección sin beneficio real de abstracción. La complejidad no justifica la ceremonia.

**Cuándo tendría sentido:** si la fuente de datos fuera la API real de YouTube — con OAuth tokens, manejo de cuotas, respuestas paginadas y fallos parciales — una Facade sería la decisión correcta. Ocultaría toda esa complejidad detrás del mismo contrato `getVideos()` que ya usa el controller, haciendo el service testeable sin tocar código de red.

---

### Patrón Strategy para el ordenamiento

El patrón Strategy define una familia de algoritmos intercambiables detrás de una interfaz común. Se consideró para la lógica de ordenamiento en `getVideos`.

La implementación actual:
```ts
videos.sort((a, b) =>
  sort === 'date'
    ? dateMap.get(b.id)! - dateMap.get(a.id)!
    : b.hypeLevel - a.hypeLevel,
);
```

Una versión con Strategy se vería así:
```ts
interface SortStrategy {
  sort(videos: VideoItem[], dateMap: Map<string, number>): VideoItem[];
}
class HypeSortStrategy implements SortStrategy { ... }
class DateSortStrategy implements SortStrategy { ... }
```

**Por qué no se aplicó:** hay exactamente dos opciones de ordenamiento y es poco probable que crezcan. El condicional es una línea. Aplicar Strategy aquí implicaría tres archivos nuevos, dos clases y una interfaz para reemplazar un ternario. Eso es la definición de over-engineering — agregar abstracción antes de que el problema exista.

**Cuándo tendría sentido:** si las opciones de ordenamiento fueran configurables por el usuario, se cargaran desde un archivo de configuración, o se esperara que crecieran a cinco o seis variantes (por views, por likes, por comentarios, por canal), Strategy sería el movimiento correcto. El código actual está estructurado de forma que agregar una tercera opción de sort requiere cambiar una sola línea — suficientemente bueno hasta que ese momento llegue.

---

## Decisiones de Testing

### Backend: tests unitarios en el Service, E2E en el Controller
La lógica de hype y fechas vive en el Service — ahí están las reglas de negocio, por eso se prueban exhaustivamente. Los tests están organizados **por regla de negocio**, no por método, y cada nombre describe el comportamiento esperado como una user story.

**Lo que no se testeó:** los interceptors y filtros en aislamiento. Son wrappers delgados sin lógica de negocio — testearlos sería testear internos de NestJS.

### Frontend: tests de comportamiento con React Testing Library
Los tests del componente verifican lo que el usuario ve y hace. Los tests del App verifican **interacciones reales**: el loading state oculta las cards, el botón de retry llama a refetch, el toggle de idioma cambia el texto de la UI.

**Lo que no se testeó:** el hook `useVideos` en aislamiento. El tool correcto para eso es MSW (Mock Service Worker) — fuera del alcance de esta entrega, anotado como next step.

---

## Qué haría con más tiempo (next steps)

1. **Integración con MSW** para tests del hook `useVideos` — mockear la API a nivel de red, no con `vi.mock`.
2. **Paginación** — 50 items está bien, pero 500 necesitaría virtual scrolling o paginación server-side.
3. **Stale-while-revalidate** en el frontend — mostrar datos en caché mientras se re-fetchea en background.
4. **Error boundaries** en React — evitar que un componente roto tire todo el árbol.
5. **Integración real con YouTube API** — el service ya está estructurado para reemplazar el JSON file con una llamada HTTP con mínimos cambios.
6. **Búsqueda y filtrado** por canal o tecnología.
7. **Puntaje de Hype normalizado** (0-100) para que sea más legible para el usuario final.

---

## Problemas encontrados y cómo se resolvieron

### 1. Error de filesystem read-only en Docker al primer `docker-compose up --build`

**Error:** `failed to solve: read-only file system` en el paso `WORKDIR /app` dentro del builder stage del backend.

**Causa raíz:** Es un problema del Docker daemon en la máquina host — no del Dockerfile ni del código. Ocurre cuando el filesystem overlay de Docker Desktop entra en un estado corrupto o de solo lectura, típicamente tras un ciclo de suspensión/reanudación del sistema o un apagado incorrecto.

**Solución:**
```bash
# Opción A: reiniciar Docker Desktop
killall Docker && open /Applications/Docker.app

# Opción B: si persiste, limpiar el estado de Docker
docker system prune -f
docker-compose up --build
```

**Lo que se descartó:** el Dockerfile fue verificado como correcto — build multi-stage, `WORKDIR`, `COPY`, `RUN npm ci` siguen patrones estándar de producción. El error era específico del entorno, no del código.

**Lección aprendida:** documentar errores del Docker daemon explícitamente para que otros developers del equipo no pierdan tiempo debugueando el Dockerfile cuando el problema es el motor de Docker.

---

### 2. `verbatimModuleSyntax` de TypeScript requiere `import type`

**Error:** `'Video' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled`

**Causa raíz:** El `tsconfig.json` por defecto de Vite habilita `verbatimModuleSyntax`, que requiere que los imports de solo tipos usen la sintaxis `import type` explícitamente.

**Solución:** Se cambiaron todos los imports de tipos en el frontend de `import { Video }` a `import type { Video }`. Esto es en realidad mejor práctica — hace la intención explícita y ayuda a los bundlers a hacer tree-shaking más agresivamente.

---

### 3. Flakiness en tests de fechas relativas

**Error:** Un test que afirmaba "hace 2 meses" fallaba intermitentemente porque `setMonth(month - 2)` produce diferentes cantidades de días según el mes actual (por ejemplo, restar 2 meses desde abril cae en febrero, que tiene menos días — resultando en 59 días en lugar de 60+).

**Solución:** Se reemplazó `setMonth()` con `setDate(date.getDate() - 61)` — un offset fijo de 61 días siempre cae en el bucket de "2 meses" de la fórmula de fecha relativa, haciendo el test determinístico sin importar cuándo se ejecute.

---

### 4. Fallo SSL en `via.placeholder.com` — servicio de imágenes externo no confiable

**Síntoma:** Las imágenes fallan con `PR_END_OF_FILE_ERROR` o `SSL_ERROR_RX_RECORD_TOO_LONG`. El JSON mock usa URLs de `via.placeholder.com` para las miniaturas, un servicio de terceros con disponibilidad intermitente y problemas de SSL.

**Causa raíz:** Dependencia externa fuera de nuestro control. El JSON mock fue proporcionado tal cual para el ejercicio y usa URLs de placeholder que ocasionalmente caen.

**Solución:** Se agregaron handlers `onError` en `VideoCard` y `CrownCard`. Cuando la imagen falla, el componente muestra un placeholder estilizado con la primera letra del título del video — manteniendo el layout intacto y visualmente coherente sin importar la disponibilidad del servicio externo.

**Por qué no se modificaron las URLs del JSON:** El mock es la fuente de verdad proporcionada para el ejercicio. Modificarla ocultaría los datos reales usados por el API. La solución correcta es resiliencia en la capa de presentación, no parchear los datos.

---

## Herramientas de IA utilizadas

Se utilizó Claude Code (claude-sonnet-4-6) como asistente durante el desarrollo.

**Prompts más relevantes:**

- *"Tengo este JSON de YouTube con 50 videos. Antes de implementar el cálculo de hype, ¿qué casos borde debo anticipar?"* — Me ayudó a estructurar el análisis previo: detecté la división por cero, el `commentCount` ausente y las variantes de mayúsculas en "Tutorial" antes de escribir una sola línea.
- *"Tengo el `TransformInterceptor` y el `LoggingInterceptor` registrados globalmente. ¿Hay algún problema de orden de ejecución que deba considerar?"* — Confirmé que NestJS aplica interceptors en el orden en que se registran y que el logging debe ir primero para capturar el tiempo real de respuesta.
- *"¿`?lang` como query param o `Accept-Language` como header para manejar el idioma de las fechas? Dame los tradeoffs."* — Razoné que query param es más cache-friendly y más explícito para un cliente SPA; header tiene sentido en APIs públicas con negociación de contenido real.
- *"Mis tests de fecha fallan de forma intermitente según el mes en que se ejecutan. Este es el código: `date.setMonth(date.getMonth() - 2)`. ¿Por qué?"* — Identificamos que restar meses tiene comportamiento variable según los días del mes actual; la solución fue usar un offset de días fijo.

La IA fue usada para razonar decisiones puntuales y depurar comportamientos no obvios. Las decisiones de arquitectura, la estructura del proyecto y los tradeoffs documentados aquí son propios.

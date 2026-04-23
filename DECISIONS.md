# Technical Decisions

## General approach

The goal was to build a production-quality solution with clean, working code and good patterns, without unnecessary abstractions. Every feature added has a concrete justification.

### Why this solution goes beyond the minimum requirements

**A note on context:** I have professional experience in software development, but not with NestJS or React specifically — those are not the stacks I have used at work. My background includes Angular, where decorators, dependency injection, and pipes map directly to NestJS, which made the framework approachable. On the React side, I have built projects outside of a professional context. The quality of this delivery comes from applying fundamentals built through real work experience — typed contracts, layered architecture, testing discipline — transferred deliberately into a new stack. That gap is also what makes this role genuinely interesting: there is real room to grow in this ecosystem. I researched Sundevs' growth plan before applying and I am fully aligned with it — this is not a fallback position, it is a deliberate choice.

The technical test asked for: a NestJS endpoint that calculates a Hype score, and a React frontend that displays the results. The delivered solution also includes i18n, dark/light theming, Docker, CI, Swagger, skeleton loaders, and animation effects.

This was a deliberate choice, and it comes with a self-aware caveat.

**The justification for each addition:**

| Feature | Why it was added |
|---|---|
| `?lang=es\|en` query param + react-i18next | Sundevs operates in a bilingual context. Internationalizing both the API response dates and the UI strings is a realistic requirement, not a hypothetical one. |
| Dark/light theme with CSS design tokens | Design tokens are the right architectural choice for any UI that needs theming — they make future color changes a one-line edit. The toggle itself took minutes once the token system existed. |
| Docker + docker-compose | The test asks to "run the app." Docker guarantees it runs identically on any machine, including the evaluator's. Without it, "works on my machine" is the only guarantee. |
| Multi-stage nginx build | A `vite preview` container is not production-appropriate. If Docker is already in scope, doing it correctly costs almost nothing extra. |
| GitHub Actions CI | Two jobs, 30 lines of YAML. If the repo is on GitHub, a pipeline that runs tests on every push is a baseline expectation, not an extra. |
| Swagger docs | NestJS generates this from existing decorators with one `DocumentBuilder` call. The cost was near zero; the benefit for the evaluator reviewing the API is real. |
| Skeleton loaders + image fallback | The mock data uses placeholder URLs that fail with SSL errors. Without fallbacks, the app looks broken on first load. These are not polish — they are correctness. |
| Confetti + count-up animation | These are the only features that are genuinely optional. They were added last, after all functional and quality requirements were met, and they are isolated to two small hooks that can be removed without touching any business logic. |

**The self-aware caveat:**

This solution is over-engineered relative to the stated requirements, and I know it. A 50-item static JSON file does not need i18n, Docker, a CI pipeline, or a confetti hook. I am aware of that.

The honest reason it was built this way: a technical test is one of the few contexts where I own the full scope and the time budget entirely. I used that freedom deliberately to show the level I can reach, not what I would ship under a one-day deadline. In a real sprint, with tickets, estimates, and a team waiting on my output, the right call is to deliver the core cleanly and propose improvements in the retro — not to add them unilaterally.

The signal I would want an evaluator to take from this is not "this person will over-build everything." It is: "this person has a ceiling, knows where the line is, and chose to cross it here consciously." The DECISIONS.md exists precisely to show that the tradeoffs were reasoned, not accidental — including the ones that went too far.

---

## Architecture

Both projects live in a monorepo for simplicity, but are independently deployable. There is no shared package between backend and frontend — at this scale that abstraction would cost more than it saves.

```
test_hype_billboard/
├── backend/     ← NestJS API
├── frontend/    ← React + Vite SPA
└── docker-compose.yml
```

---

## TypeScript strictness

### `@typescript-eslint/no-explicit-any: error` — enforced, not silenced

The ESLint rule `@typescript-eslint/no-explicit-any` is set to `'error'` in both backend and frontend. Disabling it (setting it to `'off'`) is a common shortcut that hides type-safety problems instead of solving them.

Three places in the codebase required explicit handling of `any`:

**1. `JSON.parse()` in `VideosService`**

`JSON.parse()` always returns `any` in TypeScript — by design, because TypeScript cannot know at compile time what structure a JSON file on disk will have. The solution is not to suppress the error but to define the expected shape and cast explicitly:

```ts
interface MockDataFile {
  items: RawVideo[];
}

private readonly items: RawVideo[] = (
  JSON.parse(fs.readFileSync(..., 'utf-8')) as MockDataFile
).items;
```

This is an informed cast, not a blind one. The `RawVideo` interface documents exactly what fields are expected from each item in the YouTube mock data. If the file doesn't match that shape, the error surfaces at the point of use — not silently.

**2. `context.switchToHttp().getRequest()` in `LoggingInterceptor`**

NestJS's `getRequest()` returns `any` because the framework supports multiple transport protocols (HTTP, WebSockets, gRPC). The fix is to pass the expected type as a generic:

```ts
const req = context.switchToHttp().getRequest<Request>();
```

`Request` is the Express `Request` type. Now `method` and `url` are properly typed.

**3. `@Transform` callback in `GetVideosDto`**

The `value` parameter in class-transformer's `@Transform` decorator is typed as `any` in its internal API. The fix is to annotate it explicitly:

```ts
@Transform(({ value }: { value: string }) => parseInt(value, 10))
```

In all three cases the solution was to resolve the type gap, not to disable the rule.

---

## Backend decisions

### NestJS module structure — flat, not deep
A single `VideosModule` with one controller and one service. No repositories, no use-case layer, no domain objects. The data source is a static JSON file — adding those layers would be pure ceremony with no benefit.

**Tradeoff:** if the data source changes to a real database, a repository layer would need to be added. Acceptable for now.

### Reading the JSON file once at startup
The file is read synchronously and parsed **once**, when the `VideosService` class is instantiated at application startup. The result is stored in a private readonly field and reused for every request:

```ts
private readonly items: RawVideo[] = (
  JSON.parse(fs.readFileSync('mock-youtube-api.json', 'utf-8')) as MockDataFile
).items;
```

This avoids hitting the filesystem on every request. Because the data is static, there is no reason to re-read it — the content will never change between requests.

The **in-memory cache (TTL: 60s)** on the endpoint adds a second layer: even the in-memory computation (hype calculation, sorting, date formatting) is skipped for repeated identical requests within the TTL window. With truly static data the TTL is largely symbolic, but it establishes the correct pattern for when the data source becomes dynamic.

**Tradeoff:** if the JSON file were updated at runtime (e.g. a cron job refreshing it from YouTube), the service would keep serving stale data until the process restarts. The fix would be to replace the class-field initialization with a scheduled re-read. Not applicable here since the file is part of the build artifact.

### No `moment.js` or `date-fns` for relative dates
Requirement explicitly forbade date libraries. The custom `getRelativeDate` function handles: just now / days / weeks / months / years, with Spanish and English support, using only `Date` native APIs.

**Tradeoff:** edge cases like leap years in month calculations are approximated (30-day months). Acceptable for display-only text.

### i18n via query param (`?lang=es|en`)
Instead of auto-detecting locale from headers, the language is explicitly passed by the client. This makes the API stateless and cache-friendly — the same request URL always returns the same result.

**Tradeoff:** the client must manage its own locale state and re-fetch on language change. This is the right call for a cacheable API.

### Response envelope
All responses follow `{ data, meta, status }`. This is a minor addition but it gives consumers a consistent contract — error shape matches success shape.

### Global exception filter
Catches all unhandled exceptions and returns a uniform JSON error body. Without this, NestJS defaults to returning inconsistent shapes for different error types.

### Validation with `class-validator`
Query params are validated via a DTO. Invalid params (`?sort=invalid`, `?limit=999`) return 400 with a descriptive message. This is the NestJS standard and prevents silent failures.

---

## Frontend decisions

### Vite + React (no Next.js)
The requirement is a pure consumer of the NestJS API with no SSR, routing, or SEO requirements. Vite is faster to develop with and produces a smaller bundle than CRA.

### react-i18next for UI strings
The UI has two languages (ES/EN). `react-i18next` is the industry standard for React i18n. The language switcher re-fetches the API with `?lang=en|es` so the dates also change language — the whole experience is consistent.

### `useVideos` custom hook
Encapsulates fetch logic, loading, error, and refetch in one place. The component layer stays declarative and easy to test.

### Crown Jewel always visible, regardless of sort
When sorting by date, the Crown Jewel (highest hype) may not be position #1. The decision was to **always display it first and highlighted**, regardless of sort. This matches the user story — "the video with the highest hype must stand out."

**Tradeoff:** this breaks strict sort order in the visual layer. The sort still applies to all other cards. An alternative would be to remove the crown highlight when sorting by date, but that felt like a worse UX.

### Nginx as the production web server in Docker

When containerizing the frontend, using `vite preview` or `npx serve` is a common shortcut — but neither is production-appropriate. They lack static asset caching headers and proper SPA fallback routing.

The frontend Dockerfile uses a **two-stage build**:

1. **Builder stage** (`node:20-alpine`): runs `npm ci` + `vite build`. Produces an optimized `dist/` with hashed asset filenames (`main.a3f21b.js`).
2. **Production stage** (`nginx:alpine`): copies only the `dist/` folder into a bare nginx image. No Node.js, no source code, no `node_modules` in the final image — the container weighs ~25MB.

The full `nginx.conf` with line-by-line explanation:

```nginx
server {
  listen 80;
  # Tells nginx which port to accept connections on inside the container.
  # docker-compose maps host port 80 → container port 80.

  root /usr/share/nginx/html;
  # The directory where nginx looks for files to serve.
  # This is exactly where the Dockerfile copies the Vite dist/ folder.

  index index.html;
  # Default file to serve when a directory is requested (e.g. GET /).

  location / {
    try_files $uri $uri/ /index.html;
    # For every request, nginx tries three things in order:
    #   1. $uri        → look for an exact file match (e.g. /assets/logo.png)
    #   2. $uri/       → look for a directory with an index (rarely used here)
    #   3. /index.html → fall back to the React entry point
    # Without this, a hard refresh on /dashboard would return a 404 because
    # there is no physical file called "dashboard" on disk — React Router
    # handles that path client-side, but only after index.html is served.
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    # Matches any request whose path ends with one of these extensions.
    # The ~* makes the match case-insensitive.

    expires 1y;
    # Sets the Expires header 1 year into the future.
    # Browsers will not re-request these files until the year is up.

    add_header Cache-Control "public, immutable";
    # public  → the response can be cached by any intermediate cache (CDN, proxy).
    # immutable → tells the browser the file content will never change,
    #             so it should not even send a conditional request (If-None-Match)
    #             during the 1-year window.
    # This is safe because Vite appends a content hash to every filename
    # (e.g. index-DpKQQgNn.js). A new build produces a new hash → new URL →
    # cache is bypassed automatically. Old URL = old content, always.
  }
}
```

**Tradeoff:** nginx adds a step to the local mental model — developers run `npm run dev` locally but the Docker container uses nginx. The alternative (`vite preview`) is simpler but removes the caching layer, which is a meaningful performance regression for repeated visits.

### CSS Modules over styled-components or Tailwind
CSS Modules keep styles scoped without a build plugin or runtime cost. Tailwind would be fine too, but for a self-contained technical test, plain CSS with modules is more readable and portable.

---

## Patterns considered and intentionally not applied

### Husky (git hooks for linting and tests)

Husky runs scripts on git events (`pre-commit`, `pre-push`) to enforce linting and tests before a commit lands. It was considered and deliberately excluded.

**Why not:** Husky solves a team problem — preventing developers from committing code that breaks the linter or the test suite. In a single-developer project, that enforcement has no value: the developer is the only person committing, and the discipline to run `npm test` before committing is personal, not structural.

More importantly, Husky can be bypassed with `git commit --no-verify`. It is not a reliability guarantee — it is a soft gate. The CI pipeline added in `.github/workflows/ci.yml` provides the same guarantee without any bypass: every push to `main` runs `tsc`, `eslint`, `npm test`, and `npm run build` in a clean environment. That cannot be skipped.

**When it would make sense:** in a team repo where multiple developers contribute, Husky (combined with `lint-staged` to only lint changed files) is a worthwhile first line of defense. It catches issues locally before they reach CI, reducing unnecessary pipeline runs.

---

### Facade pattern on the data layer

The Facade pattern places a simplified interface in front of a complex subsystem. It was considered for wrapping the raw YouTube JSON structure behind a cleaner data layer.

The `VideosService` already acts as an informal facade: `getVideos()` hides the complexity of reading the file, parsing raw `statistics` and `snippet` fields, calculating hype, formatting dates, marking the crown, sorting, and slicing — all behind a single method call. The controller knows nothing about any of that.

**Why a formal Facade class was not created:** the "subsystem" here is a single static JSON file, not a complex external API with authentication, pagination, and error states. Introducing a `YouTubeDataFacade` class would add a layer of indirection with no real abstraction benefit. The complexity does not justify the ceremony.

**When it would make sense:** if the data source were the real YouTube API — with OAuth tokens, quota management, paginated responses, and partial failures — a Facade would be the right call. It would hide all that complexity behind the same `getVideos()` contract the controller already uses, making the service testable without touching network code.

---

### Strategy pattern for sorting

The Strategy pattern defines a family of interchangeable algorithms behind a common interface. It was considered for the sort logic in `getVideos`.

The current implementation:
```ts
videos.sort((a, b) =>
  sort === 'date'
    ? dateMap.get(b.id)! - dateMap.get(a.id)!
    : b.hypeLevel - a.hypeLevel,
);
```

A Strategy version would look like:
```ts
interface SortStrategy {
  sort(videos: VideoItem[], dateMap: Map<string, number>): VideoItem[];
}
class HypeSortStrategy implements SortStrategy { ... }
class DateSortStrategy implements SortStrategy { ... }
```

**Why it was not applied:** there are exactly two sort options, and they are unlikely to grow. The conditional is one line. Applying Strategy here would mean three new files, two classes, and an interface to replace a ternary. That is the definition of over-engineering — adding abstraction before the problem exists.

**When it would make sense:** if sort options were user-configurable, loaded from a config file, or expected to grow to five or six variants (by views, by likes, by comments, by channel), Strategy would be the correct move. The existing code is already structured so that adding a third sort option requires changing only one line — good enough until that moment actually arrives.

---

## Testing decisions

### Backend: unit tests on the Service, E2E on the Controller
The Hype calculation and date logic live in the Service — that is where the business rules are, so that is what gets unit tested exhaustively (edge cases: no comments, zero views, mixed-case tutorial, singular/plural date forms).

The E2E tests verify the full HTTP layer: response shape, validation errors, cache behavior, and field completeness.

**What was not tested:** the interceptors and filters in isolation. They are thin wrappers with no business logic — testing them would be testing NestJS internals.

### Frontend: component-level tests with React Testing Library
Tests verify what the user sees: title, author, date, hype value, crown badge. Implementation details (CSS classes, internal state) are intentionally not tested.

**What was not tested:** the `useVideos` hook in isolation. An integration test with MSW (Mock Service Worker) would be the right tool for that — out of scope for this delivery, noted as a next step.

---

## What I would do next (given more time)

1. **MSW integration tests** for the frontend hook — mock the API at the network level, not with `vi.mock`.
2. **Pagination** — 50 items is fine, but 500 would need virtual scrolling or server-side pagination.
3. **Stale-while-revalidate** on the frontend — show cached data while re-fetching in the background instead of showing a full loading spinner on every re-fetch.
4. **Error boundaries** in React — prevent one broken component from crashing the whole tree.
5. **Real YouTube API integration** — the service is already structured to swap the JSON file for an HTTP call with minimal changes.

---

## Problems encountered and how they were solved

### 1. Docker read-only filesystem error on first `docker-compose up --build`

**Error:** `failed to solve: read-only file system` at the `WORKDIR /app` step inside the backend builder stage.

**Root cause:** This is a Docker daemon issue on the host machine — not a problem with the Dockerfile or application code. It occurs when Docker Desktop's overlay filesystem enters a corrupted or read-only state, typically after a system sleep/wake cycle or an unclean shutdown.

**Solution:**
```bash
# Option A: restart Docker Desktop
killall Docker && open /Applications/Docker.app

# Option B: if the issue persists, prune Docker's state
docker system prune -f
docker-compose up --build
```

**What was ruled out:** the Dockerfile itself was verified correct — multi-stage build, `WORKDIR`, `COPY`, `RUN npm ci` follow standard patterns used in production. The error was environment-specific, not code-specific.

**Lesson:** document Docker daemon errors explicitly so other developers on the team don't waste time debugging the Dockerfile when the issue is the Docker engine itself.

---

### 2. TypeScript `verbatimModuleSyntax` requiring `import type`

**Error:** `'Video' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled`

**Root cause:** Vite's default `tsconfig.json` enables `verbatimModuleSyntax`, which requires type-only imports to use the `import type` syntax explicitly.

**Solution:** Changed all type imports across the frontend from `import { Video }` to `import type { Video }`. This is actually better practice — it makes the intent explicit and helps bundlers tree-shake more aggressively.

---

### 3. Date calculation flakiness in tests

**Error:** A test asserting "2 months ago" failed intermittently because `setMonth(month - 2)` produces different day counts depending on the current month (e.g., subtracting 2 months from April lands in February, which has fewer days — resulting in 59 days instead of 60+).

**Solution:** Replaced `setMonth()` with `setDate(date.getDate() - 61)` — a fixed offset of 61 days always falls in the "2 months" bucket of the relative date formula, making the test deterministic regardless of when it runs.

---

### 4. `via.placeholder.com` SSL failure — external image service unreliable

**Symptom:** Images fail to load with `PR_END_OF_FILE_ERROR` or `SSL_ERROR_RX_RECORD_TOO_LONG`. The mock data uses `via.placeholder.com` URLs for thumbnails, which is a third-party service with intermittent availability and SSL issues.

**Root cause:** External dependency outside our control. The mock JSON was provided as-is for the exercise and uses placeholder URLs that occasionally go down.

**Solution:** Added `onError` handlers to both `VideoCard` and `CrownCard`. When the image fails to load, the component falls back to a styled placeholder showing the first letter of the video title — keeping the layout intact and visually coherent regardless of the external service's availability.

**Why not swap the URLs in the JSON:** The mock data is the source of truth provided for the exercise. Modifying it would obscure the real data used by the API. The right fix is resilience at the display layer, not patching the data.

---

## AI tools used

Claude Code (claude-sonnet-4-6) was used as an assistant during development.

**Relevant prompts:**

- *"I have this 50-video YouTube JSON. Before implementing the hype calculation, what edge cases should I anticipate?"* — Helped structure the upfront analysis: caught division-by-zero, absent `commentCount`, and mixed-case "Tutorial" variants before writing any code.
- *"I have `TransformInterceptor` and `LoggingInterceptor` registered globally. Is there an execution order issue I should be aware of?"* — Confirmed that NestJS applies interceptors in registration order and that logging should go first to capture accurate response times.
- *"`?lang` as a query param or `Accept-Language` header for the date language — what are the tradeoffs?"* — Reasoned that query param is more cache-friendly and explicit for a SPA client; Accept-Language makes more sense for public APIs with real content negotiation.
- *"My date tests fail intermittently depending on the month they run. Here's the code: `date.setMonth(date.getMonth() - 2)`. Why?"* — Identified that subtracting months has variable behavior depending on the current month's day count; fixed with a deterministic day offset.

AI was used to reason through specific decisions and debug non-obvious behavior. The architecture, project structure, and tradeoffs documented here are my own.

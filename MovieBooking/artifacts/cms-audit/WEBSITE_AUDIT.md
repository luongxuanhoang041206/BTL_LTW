# MovieBooking customer website audit

**Inspection date:** 2026-10-31  
**Frontend:** `D:\BTL_LTW\booking_ticket` (React 19, React Router, Vite, pnpm)  
**Backend:** `D:\BTL_LTW\MovieBooking` (ASP.NET Core MVC/Web API, EF Core, SQL Server)  
**Browser:** Configured Playwright MCP at `http://localhost:5173`  
**Scope:** Read-only inspection of the customer site and source. No bookings, seat holds, checkout, or payment submissions were made. No application source, schema, or data was changed.

## 1. Existing website page structure

`src/Route.jsx` defines the React Router tree. `src/App.jsx` wraps the route outlet with the customer header and footer, except for `/admin` routes.

| Route | Page | What inspection found |
|---|---|---|
| `/`, `/home` | `Home` | Hero, now-showing movie cards, trailer player and thumbnails. |
| `/movies` | `Movies` | Search, status filters, genre filters and movie grid. Current API result is empty; bundled demo movie data is displayed. |
| `/movies/:id` | `MovieDetails` | Movie artwork and metadata, trailer action, cinema/date/showtime selector and related movies. The inspected demo movie had no cinemas or showtimes. |
| `/movies/:id/:date` | `SeatLayout` | Legacy date-based seat flow. The component falls back to a generated demo seat map when it cannot load a real one. |
| `/movies/:id/seat/:showtimeId` | `SeatLayout` | Showtime-based seat selection, price summary and a 3D seat-view section. A demo ID produced a 400 seat-map response and the generated demo layout. No seats were selected. |
| `/foods/:showtimeId` | `FoodSelection` | Requires a held-seat draft from the preceding step. A direct visit showed “Không tìm thấy ghế đang giữ.” |
| `/booking` | `Bookings` | Requires sign-in; the inspected logged-out state shows a sign-in prompt. |
| `/payment/:bookingId` | `Payment` | Requires sign-in; the inspected logged-out state shows a sign-in prompt. No payment request was made. |
| `/favourite` | `Favourite` | Shows all seven bundled demo movies as “Your Favorite Movies,” regardless of sign-in or saved preferences. |

The booking path in code is movie details → showtime → seat selection → food/combos → checkout/payment → `/booking`. Booking, hold, checkout and payment mutations are explicit user actions; they were not triggered.

## 2. Screenshots and visual notes

Screenshots are full-page captures from Playwright MCP. They are stored in this folder.

| Screenshot | Description |
|---|---|
| [Homepage](homepage.png) | Fixed translucent black header with RoPhim logo and Vietnamese navigation; large Guardian of the Galaxy hero; dark, pink-accented now-showing grid; trailer area with substantial blank player space and four thumbnails; generic English PrebuiltUI footer. |
| [Movie listing](movie-listing.png) | Dark page with Vietnamese title/subtitle, search box, status pills, genre pills and seven movie cards. Cards contain poster, title, year, genres, runtime, booking CTA and rating. |
| [Movie detail](movie-detail.png) | Poster and movie metadata, trailer and booking controls, then cinema/showtime area and related movie cards. No cinema or schedule was available for the inspected sample. |
| [My bookings](my-bookings.png) | Logged-out prompt to sign in; booking details are not accessible in this session. |
| [Favourites](favourites.png) | Seven sample movie cards shown unconditionally. |
| [Seat selection](seat-selection.png) | Demo seat page with movie/showtime header, price, 10-row seat map, status legend, disabled continue button and a 3D viewpoint section. The seat map is fallback data, not confirmed inventory. |
| [Food selection](food-selection.png) | Missing held-seat draft state with a link back to choose a movie. |
| [Payment gate](payment-gate.png) | Logged-out prompt to sign in to continue payment. |

Playwright accessibility snapshots are also saved here: `homepage-snapshot.yml`, `movies-snapshot.yml`, `movie-detail-snapshot.yml`, `seat-selection-snapshot.yml`, `my-bookings-snapshot.yml`, `favourites-snapshot.yml`, `food-selection-snapshot.yml`, and `payment-gate-snapshot.yml`.

**Reusable visual system:** Montserrat is imported from Google Fonts and applied globally. `src/index.css` defines `--color-primary: #f84565`, `--color-primary-dull: #d63854`, white text and a `#09090b` page background. Layout and component styling primarily use Tailwind utility classes. The homepage hero has a fixed imported background image and hardcoded copy. The shared footer currently has generic English link groups and “© 2025 prebuiltUI Design” text rather than cinema-specific content.

## 3. Frontend components and source paths

Paths below are relative to `D:\BTL_LTW\booking_ticket`.

**Routing and shell**

- `src/Route.jsx` — public and Admin route table.
- `src/App.jsx` — common route outlet, customer `NavBar`, `Footer`, and toast host; hides customer shell in Admin routes.
- `src/components/Navbar.jsx` — logo, customer navigation, auth/profile dropdown, Admin link for Admin users.
- `src/components/Footer.jsx` — generic footer, newsletter/opinion textbox, link groups and social icons.
- `src/components/AuthModal.jsx`, `src/context/AuthContext.jsx` — login/register modal and session state.

**Customer pages and reusable pieces**

- `src/pages/Home.jsx` — homepage composition.
- `src/components/HeroSection.jsx` — hero banner, content and CTA.
- `src/components/FeatureSection.jsx` — now-showing content block.
- `src/components/MovieCard.jsx` — reusable movie card.
- `src/components/TrailersSection.jsx` — player and trailer thumbnails.
- `src/pages/Movies.jsx` — movie browse/search/filter page.
- `src/pages/MovieDetail.jsx` — detail view, trailer modal and related titles.
- `src/components/DateSelect.jsx` — cinema, date and showtime selectors.
- `src/pages/SeatLayout.jsx`, `src/pages/CinemaSeatMap.jsx`, `src/pages/CinemaSeatMap.css` — seat map, booking progression and 3D viewpoint.
- `src/pages/FoodSelection.jsx` — food/combos selection and checkout action.
- `src/pages/Bookings.jsx` — signed-in booking history.
- `src/pages/Payment.jsx` — signed-in payment flow.
- `src/pages/Favourites.jsx` — current sample favourites page.
- `src/components/BlurCircle.jsx`, `src/components/Loading.jsx`, `src/components/ErrorPage.jsx` — supporting UI.
- `src/assets/assets.js` — bundled demo movies, casts, trailer URLs, date/showtime examples and demo booking/dashboard data.
- `src/lib/api.js` — API request wrapper; `src/index.css` and `src/App.css` — shared tokens and styles.

**Existing Admin content tools:** `src/pages/admin/ManageMovies.jsx`, `ManageGenres.jsx`, `ManagePromotions.jsx`, `ManageFnb.jsx`, plus route/sidebar components under `src/pages/admin` and `src/components/admin`. These are operational catalog tools, not homepage/page-layout CMS screens.

## 4. Existing API integrations and hardcoded content

`src/lib/api.js` uses a same-origin empty `API_BASE`, JSON requests and `credentials: "include"`. `vite.config.js` proxies `/api` and `/seatHub` to `http://localhost:5080`; the ASP.NET app serves the built frontend from `wwwroot/app` in production.

Customer API calls in the frontend include:

- Authentication: `GET /api/auth/me`, with login/register/logout calls from the auth context.
- Movies: `GET /api/movies`, `/api/movies/now-showing`, `/api/movies/genres`, `/api/movies/{id}`.
- Scheduling: `/api/movies/{id}/cinemas`, `/api/movies/{id}/showtimes/dates`, `/api/movies/{id}/showtimes`.
- Booking: `GET /api/booking/seatmap/{showtimeId}`, and user-triggered hold, checkout, booking history and cancellation endpoints.
- Food: `GET /api/fnb/menu`; checkout is a user-triggered POST.
- Payment: payment creation/status calls in the authenticated payment flow.

**Observed runtime state:** `GET /api/movies` returned `[]` with HTTP 200, and the movie page rendered bundled `dummyShowsData`. The sample TMDB-style movie ID `324544` returned HTTP 404 from `/api/movies/324544`; cinema/date requests likewise produced no schedule for that sample. The seat map endpoint returned HTTP 400 for the demo showtime ID and `SeatLayout` rendered its local demo map instead. These findings describe this local session and data set, not all possible database records.

### Console diagnostics

After opening the homepage and allowing its trailer player to load, Playwright reported **6 console errors and 1 warning**. The page itself loaded and the screenshot was captured. The messages and likely sources are:

| Count | Console message (as reported) | Likely source / effect |
|---:|---|---|
| 1 | `Invalid DOM property `%s`. Did you mean `%s`? stroke-width strokeWidth` | `src/components/Footer.jsx` uses lowercase `stroke-width` in inline JSX SVG markup. React expects `strokeWidth`. |
| 1 | `Invalid DOM property `%s`. Did you mean `%s`? stroke-linecap strokeLinecap` | `src/components/Footer.jsx` uses lowercase SVG `stroke-linecap`; React expects `strokeLinecap`. |
| 1 | `Invalid DOM property `%s`. Did you mean `%s`? stroke-linejoin strokeLinejoin` | `src/components/Footer.jsx` uses lowercase SVG `stroke-linejoin`; React expects `strokeLinejoin`. |
| 1 | `Invalid DOM property `%s`. Did you mean `%s`? class className` | `src/components/Footer.jsx` uses HTML `class` attributes in JSX; React expects `className`. |
| 1 | `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` at `https://googleads.g.doubleclick.net/pagead/id` | External DoubleClick hostname did not resolve in this browser/network session. Likely triggered by the embedded YouTube player in `src/components/TrailersSection.jsx`; ad resource only. |
| 1 | `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` at `https://static.doubleclick.net/instream/ad_status.js` | Same external ad-resource DNS failure associated with the embedded YouTube player; does not stop the local page from rendering. |
| 1 warning | `The powerPreference option is currently ignored when calling requestAdapter() on Windows. See https://crbug.com/369219127` | Browser/Chromium WebGPU adapter warning. A search of the frontend source found no `requestAdapter`, `powerPreference`, or `WebGPURenderer` call, so the exact caller is not identifiable from the warning (location reported as `:0`). It appears environmental/browser-generated rather than a direct app error. |

No source fix was applied. Separately, the movie-detail route also logged a 404 for the demo ID and `ReferenceError: setShowtimesData is not defined` in `src/pages/MovieDetail.jsx` when taking its failed-API fallback, as already noted under risks.

Content currently hardcoded or demo-backed includes:

- Hero title, genre/year/runtime, copy, CTA, Marvel logo and background (`HeroSection.jsx`, `assets/backgroundImage.png`, `marvelLogo.svg`).
- Trailer thumbnail/video list (`dummyTrailers` in `assets.js`) and trailer section heading.
- Demo movie metadata, poster/backdrop URLs, descriptions, ratings, casts, dates and genres (`dummyShowsData`); these are used as fallback in browse/detail pages and always on favourites/related titles.
- Demo date/showtime/seat/booking/dashboard data (`dummyDateTimeData`, `SeatLayout.fallbackToDummy`, `dummyBookingData`, `dummyDashboardData`).
- Footer headings, links, feedback prompt, social destinations and copyright copy (`Footer.jsx`).
- Brand mark and some page labels/default values. Colors and typography are code-defined design tokens/styles rather than content.

## 5. Content suited to an Admin CMS

Prefer editable content fields rendered into the existing components, retaining the current layout and CSS. Reasonable first CMS scope:

- Homepage hero content: headline, supporting copy, CTA label/destination, artwork or background media, optional movie link, active state and display order.
- Featured movie/section configuration: selected movie IDs, section title, ordering and visibility. Movie descriptions/posters remain in the existing movie catalog; CMS should reference those records rather than duplicate movie data.
- Promotional/editorial banners or campaign cards: title, short copy, image, optional link, scheduling window and visibility. Existing promo-code administration is for discount rules and does not provide visual campaign content.
- Trailer playlist entries: thumbnail, video URL, title/alt text, order and active state.
- Customer footer content: cinema-specific link labels/URLs, contact/social links and copyright line.
- Potential navigation labels/order/visibility and simple customer-facing announcement content, if included in agreed scope.

The admin can manage catalog fields through existing movie CRUD (title, description, duration, release/end date, poster/trailer, director, actors, language, age rating, status and genres). Reuse that source of truth for movie cards and detail metadata.

## 6. Content that should remain application-controlled

- Movie status transitions and whether a title is currently bookable; these must remain consistent with release dates and showtime inventory.
- Cinema/room/showtime creation, schedule collision rules, seat layout and real-time availability/holds.
- Booking ownership, price calculation, promotion eligibility, booking cancellation/refunds, payment confirmation/webhooks and receipt state.
- Authentication, role checks and session behavior. CMS publish/write operations must stay Admin-authorized.
- Reviews/ratings derived from customer activity or trusted source data; do not allow page copy editing to overwrite transaction-derived values.
- Route structure, business rules, validation and CTA behavior. CMS should supply values to existing UI slots rather than arbitrary executable HTML or unconstrained page markup.

## 7. Potential backend and database work

There is already a secured Admin API base (`Controllers/Admin/AdminBaseController.cs`, Admin session role filter), movie CRUD (`AdminMovieController`), genres, promotions and other operations. Client movie reads are in `ApiMovieController`. SQL Server already has `Movies`, `MovieGenres`, `Genres`, and a `Promotions` table; `Promotion` is a coupon/discount entity with code, discount percent, dates and status, not a homepage campaign model.

The inspected schema has no page/hero/banner/trailer content tables. A CMS will likely need:

1. A persisted content model/table for named pages and sections/items, including a stable key/placement, text fields, image/video references, link target, sort order, active/publish state, optional start/end window, timestamps and editor user ID.
2. A media asset storage decision. Current content references imported local assets or external TMDB/YouTube URLs; no CMS upload/media pipeline was identified.
3. EF Core mapping/context updates and a versioned SQL schema migration/script for the new entities. Preserve existing movie, showtime and booking relationships.
4. Admin read/create/update/reorder/publish APIs guarded by the existing Admin session authorization; public read APIs should return only published content.
5. A customer content service/API and frontend data binding for the existing hero, promotional/featured sections, trailer list and footer. Add loading/empty/error behavior without changing visual design.
6. Change history/audit for publishing if current `AuditLogs` do not cover CMS edits. Validate URLs, text lengths, publish dates and safe media; avoid rendering raw HTML.

**Persistence note:** `MovieBookingContext` maps a `SystemSettings` entity, but the checked-in `MovieBookingDB.sql` contains no `CREATE TABLE SystemSettings`. In addition, `AdminSystemController` currently serves settings from a static in-memory DTO. Do not assume that settings screen provides durable CMS storage; verify the deployed database/schema before implementation.

## 8. Risks and dependencies

- Local API/data state is incomplete: movie list is empty and the sample movie identifier does not resolve to a database movie. CMS behavior should be validated with actual catalog records and correct route IDs.
- The detail fallback in `src/pages/MovieDetail.jsx` calls `setShowtimesData` although no such setter is declared. A `ReferenceError: setShowtimesData is not defined` was observed when the API lookup failed. The view still rendered the bundled movie, but schedule fallback is unreliable.
- Customer content and Admin catalog currently mix live API data with demo fallbacks. A CMS could appear to work while the browser is still showing stale bundled sample copy if fallback handling is not explicitly addressed.
- No public customer page CMS endpoints were identified. The front-end needs a read contract and cache/refresh behavior for published content.
- Media hosting, upload limits, image validation, rights/licensing, and URL availability are undecided. Current external assets and Google font/player requests depend on third parties.
- Existing admin write endpoints depend on the session Admin role. Admin credentials/session and production authorization behavior must be confirmed during implementation; do not weaken this boundary.
- `Promotions` represent booking discounts. Reusing that table for hero/banner campaigns would conflate business rules and marketing presentation.
- Avoid changing layout styles/tokens while implementing editable content, per the requirement to preserve existing design and behavior.
- The current customer favorites route is a static seven-movie fallback, and booking/payment pages require authentication. Their personalized states could not be inspected in this session.
- The homepage trailer player had a large blank region in the captured page; external YouTube/ad resources logged DNS errors. This may be network/environment-related and should not be confused with CMS rendering.

## 9. Proposed phased implementation plan

1. **Agree scope and content contract.** Confirm editable placements and which roles publish. Map each content field to existing component props and decide whether movie data is referenced or stored editorially.
2. **Resolve prerequisites.** Verify dev API/database connectivity and production schema; agree media storage and URL policy. Reconcile demo fallback behavior and movie ID contracts before treating screenshots as database-backed output.
3. **Design persisted model and migration.** Define content section/item entities, unique placement keys, ordering, publish windows, audit metadata and indexes. Add a reviewed, reversible SQL/EF migration without touching booking data.
4. **Add secured Admin content workflows.** Add list/edit/reorder/preview/publish APIs and UI integrated into the current Admin navigation. Keep current movie, showtime, discount and payment management contracts separate.
5. **Add public content reads and bind fixed UI slots.** Load published content into hero, curated sections, trailer thumbnails and footer while preserving the existing design tokens and markup behavior. Provide safe defaults for empty/unavailable content.
6. **Validate authorization, publishing and regression behavior.** Verify anonymous users can read only published content; only Admins can mutate it; verify ordering/scheduling/media fallbacks and that booking/showtime/payment behavior is unchanged.
7. **Seed and hand over.** Add initial content matching current customer copy, document editing/asset rules, and confirm the Admin workflow before considering launch.

## Inspection boundaries

The only page requiring a signed-in customer was My Bookings/payment. They were left at their visible login gates. Food selection was inspected only in its no-draft state. Seat selection was inspected without selecting seats or activating the hold/continue path. No login or registration form was submitted, and no checkout/payment operation was performed.

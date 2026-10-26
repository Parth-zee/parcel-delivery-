# Parcel Delivery — personal delivery tracker

**Live site:** https://parth-zee.github.io/parcel-delivery-/ (served by GitHub Pages from the
`gh-pages` branch of this repository)

A mobile-first web app you open on your own phone while delivering a parcel to
**LH-10 Mess, University of Hyderabad**. It shows who you are, where you're going,
your real GPS position on a live map, and a delivery status you update yourself,
plus a large **Show to Security** screen to hand to the hostel security desk.

Built with React + TypeScript + Vite, Leaflet + OpenStreetMap, and OSRM routing.

**Honesty by design**

- No company branding, logos, IDs, vehicle numbers, tracking numbers or "verified" badges.
- The map only ever shows a position the phone actually reported, with its time and accuracy.
  If GPS is off, blocked or lost, the app says **Location unavailable** and offers Retry. A
  last-known position is grey and labelled with its age.
- Distance and travel time appear only when a routing service returned a real route.
- Status steps change only when you confirm them. The security screen says plainly that the
  information was entered by you and isn't an official pass.

---

## 1. What works immediately, and what needs setup

| Feature | Works out of the box? |
| --- | --- |
| Interactive map (OpenStreetMap tiles) | Yes |
| Live GPS marker, accuracy circle, timestamps, auto-refresh | Yes, **on an HTTPS page** (or `localhost`) once you allow location |
| "Center on My Location", status timeline, confirmations, Show to Security | Yes |
| Status and destination pin saved on the phone between visits | Yes (browser storage) |
| Keep screen on while showing security | Yes, on browsers that support the Screen Wake Lock API (Chrome on Android does) |
| Destination pin | **Needs one step from you:** the exact LH-10 Mess entrance isn't in public map data, so the pin starts at the campus reference point and is marked *approximate*. Set it once (section 5). |
| Route line, road distance, ETA | Yes after the pin is set, using the free public OSRM demo server (car profile, fair-use only). For heavier use, configure your own routing (section 6). |

---

## 2. Install and run on a computer

Requires **Node.js 18 or newer** (20+ recommended).

```bash
npm install
npm run dev          # http://localhost:5173  (GPS works on localhost)
```

Production build:

```bash
npm run build        # output in dist/
npm run preview      # serves dist/ at http://localhost:4173
```

### Try it on your phone from your computer

Phone browsers only allow GPS on HTTPS pages, so plain `http://192.168.x.x` won't work.
Use the built-in HTTPS dev mode:

```bash
npm run dev:phone
```

Vite prints a `https://192.168.x.x:5173` address. Open it on your phone (same Wi-Fi). Chrome
warns about the self-signed certificate: tap **Advanced → Proceed**. Then allow location.
This is for testing only; for the real delivery, deploy it (section 3).

---

## 3. Deploy over HTTPS (needed for GPS on the phone)

Any static host with HTTPS works. The ready-built `dist/` folder is all you need.

### How this repository is published (GitHub Pages)

- `main` holds the source code. `gh-pages` holds only the built files from `dist/`.
- In the repository's **Settings → Pages**, the source is *Deploy from a branch*,
  branch `gh-pages`, folder `/ (root)`. The repository must be public on a free GitHub plan.
- To publish a change: `npm run build`, then replace the contents of the `gh-pages` branch
  with the new `dist/` folder and push. The site updates within a minute or two.
- The build uses relative paths (`base: './'` in `vite.config.ts`), so it works in the
  `/parcel-delivery-/` sub-folder without extra settings.

### Option A — Netlify Drop (no command line)

1. Build (`npm run build`) or use the prebuilt `dist` folder that came with this project.
2. On a computer, open **https://app.netlify.com/drop** and drag the **`dist` folder** onto the page.
   (Drag the folder itself, or a zip of it — don't drop the whole project.)
3. You get an `https://….netlify.app` address.
4. Sites dropped without an account are protected by a temporary password until you claim
   them. **Sign up / log in and claim the site** so the link opens directly on your phone.
5. To update later: in the site's dashboard, under *Production deploys*, drag the new `dist`
   folder in again.

### Option B — Vercel Drop

Open **https://vercel.com/drop**, drop the `dist` folder (or a zip of it), pick a project
name, and deploy. You get an `https://….vercel.app` address.

### Option C — Git-connected deploy (Netlify, Vercel, Cloudflare Pages)

Push this project to GitHub and import it. Settings:

- Build command: `npm run build`
- Output / publish directory: `dist`
- Node version: 20

`netlify.toml` is already set up for Netlify. Use Option C if you want the routing proxy
(section 6B), because Drop deploys don't run serverless functions.

**After deploying:** open the `https://` link on your phone in Chrome, allow location, then
optionally use Chrome's menu → **Add to Home screen** so it opens like an app.

---

## 4. Turn on GPS for the tracker on an Android phone

1. **Phone location on:** swipe down from the top → tap **Location** so it's on.
2. **Accurate location:** Settings → Location → **Location services** → turn on
   **Google Location Accuracy** (wording varies by brand).
3. **Chrome may use location:** Settings → Apps → Chrome → Permissions → **Location** →
   *Allow only while using the app*, and turn **Use precise location** on.
4. **This site may use location:** open the tracker, tap **Enable location**, then **Allow**
   in the pop-up.
5. **If you tapped "Block" earlier:** tap the icon left of the address bar (lock or tune
   icon) → **Permissions** → **Location** → **Allow**. Or Chrome ⋮ → Settings → Site settings →
   Location → find the site → Allow. Then tap **Retry** in the app.
6. Keep the tracker open on screen while delivering. Android pauses GPS for background tabs;
   the app takes a fresh reading as soon as you return to it. Battery Saver can slow updates.

---

## 5. Set the exact LH-10 Mess pin (one time)

Public map data doesn't mark the LH-10 Mess entrance, so the app won't draw a route to a
guessed point. Tap **Set pin** (or ⋮ → *Adjust destination pin*) and choose one:

- **Drag** the orange pin to the entrance, or **tap the map** where it is.
- **Use my current GPS position** — handy if you're standing at the entrance now.
- **Paste coordinates** like `17.4571, 78.3313`, or a full Google Maps / OpenStreetMap link
  that contains coordinates.
- The **UoH campus directory** button opens the university's published map link for
  *Ladies Hostels 9 & 10* for reference. Short `maps.app.goo.gl` links can't be read by the
  browser: open it, long-press the exact spot, copy the coordinates shown and paste them.

Tap **Save pin**. The pin is saved on your phone and kept when you start a new delivery.

To bake a known location into the app instead, edit `DEFAULT_DESTINATION` in
`src/config.ts` and set `confirmed: true`.

---

## 6. Configure the map and routing services

Copy `.env.example` to `.env` (or set the same variables in your host's dashboard), then rebuild.
Variables that start with `VITE_` end up in the public JavaScript, so never put a secret in one.

### Map tiles

| Variable | Default |
| --- | --- |
| `VITE_TILE_URL` | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `VITE_TILE_ATTRIBUTION` | OpenStreetMap contributors |
| `VITE_TILE_MAX_ZOOM` | `19` |

The standard OSM tile server is free for light use under the
[OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/). For heavier
use, point `VITE_TILE_URL` at a tile provider you have an account with (keep its required
attribution in `VITE_TILE_ATTRIBUTION`).

### Routing

`VITE_ROUTING_PROVIDER` chooses the mode.

**A. `osrm` (default, no key).** Calls an OSRM server straight from the browser.
`VITE_OSRM_URL` defaults to the public demo server `https://router.project-osrm.org`, which
only offers a car profile and is meant for light, fair use. The app is gentle with it: it
asks for a route only after the pin is set, then again only when you've moved 60 m or more,
and never more than once every 15 seconds. You can point `VITE_OSRM_URL` at your own OSRM
server and set `VITE_OSRM_PROFILE` to the profile it serves.

**B. `proxy` (for providers that need a secret key).** The browser calls your own endpoint
(`VITE_ROUTING_PROXY_URL`, default `/api/route`), and the server adds the key. A ready-made
Netlify Function for [OpenRouteService](https://openrouteservice.org) is included at
`netlify/functions/route.mts`:

1. Get a free OpenRouteService API key.
2. In Netlify → Site configuration → Environment variables, add `ORS_API_KEY` (and optionally
   `ORS_PROFILE`, e.g. `driving-car`, `cycling-regular`, `foot-walking`). No `VITE_` prefix.
3. Also add `VITE_ROUTING_PROVIDER=proxy`.
4. Deploy with Git or the Netlify CLI (Option C) so the function is built.

The endpoint takes `?from=lat,lng&to=lat,lng` and returns
`{ distanceMeters, durationSeconds, coordinates: [[lat, lng], …], provider, profile }`, so you
can write an equivalent proxy for any other host or provider.

**C. `none`.** No route line, distance or ETA. Everything else still works.

If routing fails, the app shows *Route unavailable* with a Retry button and draws nothing.

---

## 7. Using it on delivery day

1. Open the `https://` link and allow location. Check the chip on the map says **Live GPS**.
2. Set the destination pin if you haven't yet.
3. When you reach LH-10 Mess, tap **I've Arrived** and confirm. The time (and your GPS
   reading, if live) is recorded. If your GPS is more than 300 m from the pin, the dialog
   warns you first.
4. Tap **Show to Security** and hand over the phone. The screen stays on while it's open.
   Android's back button or **Back to tracking screen** returns.
5. After handing over, tap **Confirm Handover**, tick the box, and confirm.
6. Next time, use ⋮ → **Start a new delivery…** to reset the steps.

---

## 8. Project structure

```
src/
  config.ts                 delivery details, default pin, map/routing/GPS settings
  types.ts                  shared types
  App.tsx                   screen layout, dialogs, mode switching
  hooks/
    useGeolocation.ts       browser GPS: permission, watch, refresh, errors
    useRoute.ts             throttled route requests, only with real inputs
    useDelivery.ts          status steps and destination pin, saved in localStorage
    useWakeLock.ts          keeps the screen on in security mode
    useNow.ts               1-second clock for "x s ago" labels
  lib/
    routing.ts              OSRM and proxy clients with response validation
    geo.ts                  distance, coordinate/link parsing
    format.ts               time, distance, duration formatting (en-IN)
  components/
    TrackingMap.tsx         Leaflet map: GPS dot, accuracy circle, pin, route
    DeliverySheet.tsx       bottom card: identity, destination, actions, details
    StatusTimeline.tsx      the four delivery steps
    RouteSummary.tsx        distance / ETA, or why they're not shown
    LocationStatus.tsx      GPS chip and enable / unavailable cards
    PinEditor.tsx           set or adjust the destination pin
    SecurityView.tsx        full-screen "Show to Security" mode
    ConfirmDialog.tsx       accessible confirmation dialog
    Header.tsx              title bar and menu
netlify/functions/route.mts optional OpenRouteService proxy
```

To reuse it for another delivery, change the values in `src/config.ts`.

---

## 9. Privacy

- Your position stays in the browser. It's sent only to the routing service (as the start of
  the route request). Map tile requests reveal which map area is being viewed.
- Delivery status and the pin are stored in this browser only (`localStorage`). Clearing
  site data resets them.
- Pages are marked `noindex` so search engines don't list them.

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Location unavailable — open this page over HTTPS" | Use the deployed `https://` link, not `http://`. |
| "Location permission is blocked" | See section 4, step 5, then tap Retry. |
| Position jumps or accuracy is ±500 m+ | Wi-Fi/cell location only. Step outside or near a window; turn on Google Location Accuracy. |
| "GPS may be outdated" | No reading for 2+ minutes. Keep the page in front; check Battery Saver. |
| No route, "Route unavailable" | The routing server is busy or unreachable. Tap Retry, or configure your own routing. |
| Map is grey | Tile server unreachable (no data connection or blocked). The GPS marker and pin still work. |

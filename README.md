# Ageglass

Ageglass is an AI portrait editor that imagines the same person at a different
age. Add a portrait, choose an age from 5 to 80, optionally describe details to
preserve, and download the generated result.

> Age-shifted portraits are creative approximations, not medical predictions.
> Only upload images you have permission to edit.

## Features

- Drag-and-drop or file-picker uploads for JPEG, PNG, and WebP portraits
- Target ages from 5 through 80
- Optional instructions such as preserving glasses or changing the lighting
- Side-by-side original and generated portraits
- Downloadable results and an in-memory cache of recent variations
- English and Simplified Chinese interfaces
- Responsive, accessible controls with reduced-motion support
- Input validation, safety constraints, and server-side rate limiting

## How it works

Portraits are resized in the browser to a maximum edge of 1,024 pixels and
converted to JPEG before submission. A TanStack Start server function validates
the request, builds an age-appropriate editing prompt, and sends the image to
the xAI image-editing API. Generated images remain in the current browser
session unless the user downloads them; the selected interface language is the
only setting saved to `localStorage`.

## Tech stack

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite 8
- Tailwind CSS 4
- Zod for server-side request validation
- xAI image editing (`grok-imagine-image-2.0`)

## Getting started

### Requirements

- Node.js 22
- npm
- An xAI API key with image-generation access

### Installation

```bash
npm install
```

Provide `XAI_API_KEY` through your deployment platform or shell environment.
Do not expose it through a `VITE_`-prefixed variable, because those variables
are included in browser bundles.

Start the development server:

```bash
npm run dev
```

The app is served at `http://localhost:8080`.

## Available scripts

| Command                   | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev`             | Start the development server on port 8080                     |
| `npm run build`           | Create a production build and run pending database migrations |
| `npm run preview:restart` | Restart the local production-build preview                    |
| `npm run typecheck`       | Check TypeScript without emitting files                       |
| `npm test`                | Run the Node.js test suite                                    |
| `npm run lint`            | Run ESLint across the project                                 |
| `npm run format`          | Format project files with Prettier                            |

## Project structure

```text
src/
├── components/
│   ├── ageglass.tsx       # Main upload, age selection, and result interface
│   └── ui/                # Shared interface primitives
├── lib/
│   ├── i18n.ts            # English and Simplified Chinese copy
│   └── shift-age.ts       # Validated server-side xAI image-edit request
├── routes/                # TanStack Start routes and document shell
└── styles.css             # Theme tokens and responsive styles
```

## Usage notes and limits

- Accepted source formats are JPEG, PNG, and WebP.
- Source files may be up to 25 MB; the processed request payload is capped
  separately by the server.
- A single running server instance accepts up to six generation requests per
  minute.
- Up to four matching generated variations are cached in memory. Replacing the
  source portrait clears that cache, and refreshing the page clears all images.
- Additional instructions are limited to 280 characters in the interface and
  are filtered to keep generated portraits fully clothed and non-sexual.
- Without `XAI_API_KEY`, the interface still loads but image shifting is
  unavailable.

## Privacy and responsible use

Uploaded portraits are processed in the browser and then sent through the app's
server to xAI to create the requested edit. This repository does not persist
portraits or generated images in a database. Deployers should review xAI's
current data-handling terms and publish a privacy policy appropriate to their
audience before making the app publicly available.

Do not use Ageglass to deceive, impersonate, harass, or create harmful content.
Generated output may be inaccurate or biased and should be treated as a
creative visualization only.

## Production checks

Before deployment, run:

```bash
npm run typecheck
npm test
npm run build
```

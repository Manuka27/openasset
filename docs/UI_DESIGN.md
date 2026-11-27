# OpenAsset UI guide

## Visual language

The workspace uses navy surfaces, cool indigo emphasis and a light alternative. Available, issued, maintenance and archived assets use green, blue, amber and neutral labels. Every status includes text. Shared CSS tokens, the system font stack and a single icon family keep screens consistent.

- `globals.css` sets the palette, focus outlines, table overflow containment and reduced-motion behavior.
- `WorkspaceShell` contains role-based navigation, the desktop sidebar, a native mobile dialog, inventory search and the account menu. `WorkspacePreferences` persists the theme and sidebar choices in local browser storage.
- `WorkspaceUI`, `StatCard`, `InventoryCharts`, `ListControls` and `ActionForm` share badges, avatars, charts, filters, errors and success feedback across pages.
- Form controls keep a stable accessible name when field errors appear. Feedback stays next to the form, and archival and return actions use keyboard-accessible confirmation dialogs.
- Dashboard charts use PostgreSQL counts. The report breakdown shows assets in the displayed results. Charts use CSS and offer a visible text and number equivalent.

## Asset sources

| Asset | Origin and attribution |
| --- | --- |
| `public/openasset-equipment.webp` | Original image generated for OpenAsset with the built-in OpenAI ImageGen tool. The image is a stylized illustration of unbranded equipment. It uses no external stock or manufacturer imagery. The optimized local WebP is 29 KB. |
| `src/app/icon.svg` and `Brand.tsx` | Original OpenAsset double-diamond mark made in this repository. |
| Lucide React 1.81.0 | ISC license. Copyright 2026 Lucide Icons and Contributors. The installed dependency includes the license notice. [Lucide](https://lucide.dev/) |

ImageGen prompt

> Use case: stylized-concept. Original enterprise inventory sign-in illustration, landscape 3:2. A clearly stylized 3D still life of an unbranded IT equipment stack: open laptop with a simple abstract blue screen, compact rack appliance, and one small asset tag, on a single low plinth. Matte graphite and midnight navy surfaces, restrained electric indigo and ice-blue rim lights, soft studio shadows, subtle fine grid in deep navy backdrop. Frame the objects fully within the central two-thirds with generous negative space and darker corners for clean integration. Premium editorial product-render aesthetic, simple readable silhouettes. No text, letters, logos, watermark, people or realistic branded product photography.

## Operating and testing

Start the application with `npm run dev`. Open `/login`, enter your local account privately, and use the account menu to sign out. Theme and layout preferences stay with the browser and require no database change. Run `npm test` for the existing suite. Use a disposable PostgreSQL container for authenticated write tests.

Test widths around 375, 768, 1366 and 1920 pixels. At small widths, open the mobile menu and press Escape to dismiss it. Keyboard users can skip to content and tab into tables that scroll locally. Verify dark and light modes, forms with invalid inputs, a confirmation dialog, and CSV export before release.

Step 74 screenshots from the disposable browser test environment are under `/tmp/openasset-ui-qa.uiAf8hcM/screenshots/`. The set includes the desktop login, dark and light desktop dashboards, and mobile dashboard and inventory screens. The screenshots use fictional data and stay local.

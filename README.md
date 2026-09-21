# UGC Factory

Paste a product URL. The press scrapes **that page only** — product, problem, how it is used, how to promote it, and page assets — writes a global English brief, scouts rivals, mints format α/β tests, then you generate a 9:16 UGC video.

[github.com/calmverdant/ugc-factory](https://github.com/calmverdant/ugc-factory)

## What it does

- **Firecrawl scrape.** Paste a URL and the press reads markdown + HTML + pack shots. You see a scrape card (engine, character count, assets, JSON-LD). Brief writer and rival scout then run together.
- **One product per paste.** A new URL hard-cuts the last brief. Home starts a clean paste. Continue last brief is optional.
- **Full page scrape.** JSON-LD, pack shots classified (hero / pack / lifestyle), problem, how to use, promotion, benefits.
- **Rival scout** — automatic. No extra paste.
- **Format α/β** — same hook family, two formats, predicted winner.
- **31 hooks × 16 formats × 6 personas × 5 platforms**
- **Filmstrip** — 9:16 beat visualization on every ad, even before a clip exists.
- **Bundle** — sequence shots stitch into one 9:16 file.
- **Video** is a button. Image-to-video only uses stills from the current product page. Six clips a day. English, global. No accounts.

## Run

```bash
git clone https://github.com/calmverdant/ugc-factory.git
cd ugc-factory
cp .env.example .env
# put your xAI key in .env as XAI_API_KEY=...
npm install
npm run dev
```

Open `http://localhost:8080`.

Without `XAI_API_KEY`, samples (`demo`, `aera`, `harbor`) still mint ads. URL briefs, rewrite, stills, Eve voice, and video need the key.

```bash
npm run typecheck
npm run build
```

## Stack

TanStack Start · React 19 · Tailwind v4 · Radix · xAI (`grok-4.5`, Imagine image/video, Eve TTS)

Packs, roster, and brand kit live in `localStorage`. Auth and a database are off on purpose.

## License

Private. All rights reserved unless you say otherwise.

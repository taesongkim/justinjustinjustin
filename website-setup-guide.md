# Website Setup Guide: Next.js + Vercel + GitHub

A minimal, best-practices workflow for building and deploying a website you can iterate on through Cowork, preview locally, and ship via GitHub pushes.

---

## Overview

| Layer | Tool | Why |
|-------|------|-----|
| Framework | Next.js | Static pages now, dynamic features later. File-based routing means each page is just a file. |
| Hosting | Vercel | Free tier, auto-deploys on every `git push`, handles HTTPS and your custom domain. |
| Version control | GitHub | Push to `main` → Vercel auto-deploys to production. |
| Local dev | `next dev` | Hot-reload in your browser as you edit. |
| Iteration | Cowork | Edit code here, push to GitHub, see it live. |

**You do NOT need AWS, Google Cloud, or any paid infrastructure.**

---

## Step 1: Install Prerequisites

Make sure you have these on your machine:

```bash
# Check if you have Node.js (need v18+)
node --version

# Check if you have Git
git --version
```

If you don't have Node.js, install it from [nodejs.org](https://nodejs.org) (LTS version).

---

## Step 2: Create Your Next.js Project

```bash
npx create-next-app@latest my-site
```

When prompted, choose these options:

- TypeScript → **Yes** (recommended, but No is fine if you prefer plain JS)
- ESLint → **Yes**
- Tailwind CSS → **Yes** (great for styling without separate CSS files)
- `src/` directory → **No** (simpler structure)
- App Router → **Yes** (the modern default)
- Import alias → **Keep default (@/*)**

This creates a `my-site/` folder with everything wired up.

---

## Step 3: Run It Locally

```bash
cd my-site
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You'll see the default Next.js page. **Every file change you make will instantly appear in the browser** — no manual refresh needed.

---

## Step 4: Understand the File Structure

```
my-site/
├── app/
│   ├── layout.tsx      ← Wraps every page (nav, footer, fonts, etc.)
│   ├── page.tsx        ← Your homepage (yoursite.com/)
│   ├── about/
│   │   └── page.tsx    ← yoursite.com/about
│   └── blog/
│       └── page.tsx    ← yoursite.com/blog
├── public/             ← Static files (images, favicon, etc.)
├── package.json
└── next.config.ts
```

**Adding a new page** is as simple as creating a new folder with a `page.tsx` inside `app/`. The folder name becomes the URL path.

---

## Step 5: Push to GitHub

### 5a. Create a GitHub repo

Go to [github.com/new](https://github.com/new), create a new repository (e.g., `my-site`). **Don't** initialize it with a README (your project already has files).

### 5b. Connect and push

```bash
cd my-site
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/my-site.git
git branch -M main
git push -u origin main
```

---

## Step 6: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your **GitHub account**.
2. Click **"Add New Project"**.
3. Import your `my-site` repository from GitHub.
4. Vercel auto-detects Next.js — just click **Deploy**.
5. In about 60 seconds, your site is live at `your-project.vercel.app`.

**From now on, every push to `main` triggers an automatic deploy.**

---

## Step 7: Connect Your Custom Domain

1. In Vercel, go to your project → **Settings** → **Domains**.
2. Type in your domain (e.g., `yoursite.com`) and click **Add**.
3. Vercel will show you DNS records to add. Go to your domain registrar and:

   **Option A — Nameservers (easiest, recommended):**
   Point your domain's nameservers to Vercel's:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

   **Option B — DNS records (if you want to keep your current nameservers):**
   Add these records at your registrar:

   | Type | Name | Value |
   |------|------|-------|
   | A | @ | `76.76.21.21` |
   | CNAME | www | `cname.vercel-dns.com` |

4. Wait for DNS propagation (usually minutes, sometimes up to 48 hours).
5. Vercel automatically provisions an SSL certificate — HTTPS just works.

---

## Step 8: Your Iteration Workflow

### Day-to-day development cycle

```
1. Edit code (locally or in Cowork)
       ↓
2. Preview locally: npm run dev → localhost:3000
       ↓
3. Commit & push:
     git add .
     git commit -m "Add about page"
     git push
       ↓
4. Vercel auto-deploys → live on your domain in ~60s
```

### Working through Cowork

You can edit your project files through Cowork by selecting your project folder. Then:

- Ask Claude to create/edit pages, components, styles
- Preview changes by running `npm run dev` locally in your terminal
- When you're happy, push to GitHub and it's live

### Preview deploys (bonus)

If you push to a **branch other than main**, Vercel creates a unique preview URL for that branch. This lets you test changes before merging to production:

```bash
git checkout -b new-feature
# make changes
git push -u origin new-feature
# Vercel gives you a preview URL like: my-site-abc123.vercel.app
# When ready, merge to main → goes live on your real domain
```

---

## Quick Reference: Common Tasks

### Add a new page

Create `app/contact/page.tsx`:

```tsx
export default function ContactPage() {
  return (
    <main>
      <h1>Contact</h1>
      <p>Get in touch.</p>
    </main>
  );
}
```

Now `yoursite.com/contact` exists.

### Add navigation

Edit `app/layout.tsx` to include a nav that appears on every page:

```tsx
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

### Add an image

Drop the image in `public/`, then reference it:

```tsx
import Image from "next/image";

<Image src="/my-photo.jpg" alt="Description" width={800} height={600} />
```

### Environment variables (for future API keys, etc.)

Create a `.env.local` file (never committed to Git):

```
DATABASE_URL=your_secret_here
```

Add secrets in Vercel under **Settings → Environment Variables** for production.

---

## Checklist

- [ ] Node.js v18+ installed
- [ ] `npx create-next-app@latest my-site`
- [ ] `npm run dev` works at localhost:3000
- [ ] GitHub repo created and code pushed
- [ ] Vercel account linked to GitHub
- [ ] Project imported and deployed on Vercel
- [ ] Custom domain added in Vercel settings
- [ ] DNS records configured at your registrar
- [ ] Push a change to `main` and confirm it auto-deploys

---

## What You Don't Need

- **No AWS** — Vercel handles hosting, CDN, and SSL for free.
- **No Google Cloud** — Nothing to configure there.
- **No CI/CD setup** — Vercel's GitHub integration IS your CI/CD.
- **No web server config** — No nginx, Apache, or Docker needed.
- **No database** (yet) — Add one later if/when you need it (Vercel Postgres, Supabase, etc.).

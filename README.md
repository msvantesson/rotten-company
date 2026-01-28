# Rotten Company

A transparency platform that rates companies based on evidence of corporate misconduct, workplace toxicity, and ethical failures.

---

## 📚 **Visual Documentation**

**New to the codebase?** We have comprehensive visual documentation!

### Quick Links
- 🚀 **[QUICKSTART.md](QUICKSTART.md)** - Start here! (5-min overview, common tasks)
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design & data flow diagrams
- 🧩 **[COMPONENT_MAP.md](COMPONENT_MAP.md)** - React components guide
- 🚀 **[API_GUIDE.md](API_GUIDE.md)** - API routes & backend flows
- 📖 **[DOCS_INDEX.md](DOCS_INDEX.md)** - Documentation map & navigation

**All documentation includes ASCII diagrams, flow charts, and visual guides!**

---

## 🚀 Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Lint Code

```bash
npm run lint
```

### Build for Production

```bash
npm run build
npm start
```

---

## 📖 What is Rotten Company?

Rotten Company is a transparency platform that:
- Collects evidence of corporate misconduct from users
- Calculates a "Rotten Score" (0-100) based on 18 harm categories
- Displays scores with visual meters and descriptive text
- Provides a leaderboard of the most problematic companies

### How It Works

```
1. Users submit evidence → 2. Algorithm calculates score → 3. Display on company page
```

**Core Features:**
- 📊 18 harm categories (labor, environmental, consumer, etc.)
- ⚖️ Weighted scoring (labor issues count most)
- 🎨 Visual score display (colors, tiers, descriptions)
- 📝 Evidence submission system
- 🏆 Company leaderboard

**Learn more:** Read [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design.

---

## 🗂️ Project Structure

```
rotten-company/
├── 📱 app/              # Next.js pages & API routes
├── 🧩 components/       # React components
├── 🔧 lib/              # Core business logic
│   ├── rotten-score.ts      # Scoring algorithm ⭐
│   ├── flavor-engine.ts     # Score → text/color
│   └── supabase-*.ts        # Database clients
└── 📚 *.md              # Visual documentation
```

**For details:** See [ARCHITECTURE.md](ARCHITECTURE.md) or [QUICKSTART.md](QUICKSTART.md)

---

## 🎯 Common Tasks

### Change Score Calculation
→ Edit `lib/rotten-score.ts` (has visual diagrams in comments)

### Change Score Display (colors, text)
→ Edit `lib/flavor-engine.ts` and `lib/micro-flavors.ts`

### Modify Evidence Form
→ Edit `components/EvidenceUpload.tsx` and `app/api/evidence/submit/route.ts`

### Change Company Page
→ Edit `app/company/[slug]/page.tsx` and related components

**Full guide:** [QUICKSTART.md](QUICKSTART.md) has a complete "I want to..." reference

---

## 🧰 Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Email:** Nodemailer
- **Hosting:** Vercel (or any Node.js host)

---

## 📊 The Scoring System

Rotten Company uses a sophisticated scoring algorithm:

1. **18 Harm Categories** (toxic workplace, wage abuse, pollution, etc.)
2. **Weighted Average** (labor issues = 32%, environmental = 20%, etc.)
3. **Company Size Multiplier** (larger companies = stricter standards)
4. **Ownership Type Multiplier** (PE/hedge funds = higher scrutiny)
5. **Geographic Multiplier** (western/global = higher expectations)

**Result:** A score from 0 (clean) to 100 (extremely rotten)

**Visual diagrams:** See [ARCHITECTURE.md](ARCHITECTURE.md) or `lib/rotten-score.ts`

---

## 🎨 Visual Design System

### Score Tiers
```
 0-10:  ✨ Mostly Decent
10-25:  🟡 Mildly Rotten
25-40:  🟠 Rotten Enough to Notice
40-55:  🔴 Serious Rot Detected
55-70:  💀 Rotten but Redeemable
70-85:  🏴 Corporate Disaster Zone
85-95:  ⭐ Working for the Empire (Star Wars)
95-100: 😈 Working for Satan
```

### Color Palette
- 0-15: 🟢 Green (clean)
- 15-30: ⚪ Gray (minor issues)
- 30-45: 🟤 Tan (noticeable)
- 45-60: 🟡 Gold (warning)
- 60-75: 🟠 Orange (serious)
- 75-90: 🔴 Red (very bad)
- 90-100: ⚫ Dark Red (rotten)

**Details:** [COMPONENT_MAP.md](COMPONENT_MAP.md) or `lib/flavor-engine.ts`

---

## 🤝 Contributing

1. Read [QUICKSTART.md](QUICKSTART.md) to understand the codebase
2. Check out [ARCHITECTURE.md](ARCHITECTURE.md) for system design
3. Make your changes (keeping them minimal)
4. Run `npm run lint` to check for errors
5. Test locally with `npm run dev`
6. Submit a pull request

**All code files have visual comments and diagrams!**

---

## 📚 Learn More

### About This Project
- [QUICKSTART.md](QUICKSTART.md) - Fast reference guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [COMPONENT_MAP.md](COMPONENT_MAP.md) - React components
- [API_GUIDE.md](API_GUIDE.md) - API documentation

### About Next.js
- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive tutorial
- [Next.js GitHub](https://github.com/vercel/next.js) - Feedback and contributions

---

## 🚢 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 🔍 Quick Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code quality

# Documentation
cat QUICKSTART.md    # Quick reference
cat ARCHITECTURE.md  # System design
cat COMPONENT_MAP.md # React components
cat API_GUIDE.md     # API documentation
```

---

**Happy coding! 🚀**

*This project includes extensive visual documentation. Start with [QUICKSTART.md](QUICKSTART.md)!*


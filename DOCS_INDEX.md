# 📚 Visual Documentation Index

Welcome to the **Rotten Company** visual documentation system! This README will guide you to the right documentation for your needs.

---

## 🎯 Which Document Do I Need?

```
┌────────────────────────────────────────────────────────────┐
│  START HERE: What do you need?                            │
└────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    
  👋 New Here?      🔧 Adding Feature?   📊 Understanding
  QUICKSTART.md     ARCHITECTURE.md        the System?
  5-min overview    Full system design    All 4 docs
  Common tasks      Data flow diagrams
  Quick reference   Module relationships
```

---

## 📖 Documentation Files

### 🚀 [QUICKSTART.md](QUICKSTART.md) - **Start Here!**
**Best for:** New developers, quick reference, common tasks

**Contains:**
- ⚡ 5-minute overview
- 📂 Directory quick reference
- 🎯 "I want to..." task guide
- 🔍 Find what you need fast
- 💡 Pro tips and learning path

**Read this if you're asking:**
- "Where do I start?"
- "How do I run this?"
- "Where is the code for X feature?"

---

### 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) - **The Big Picture**
**Best for:** Understanding system design, data flow, high-level concepts

**Contains:**
- 📁 Full project structure with visual tree
- 🔄 Data flow diagrams (Evidence → Score → Display)
- 🎯 Core scoring engine explained with ASCII art
- 🎨 Flavor system (score → text/color)
- 🗄️ Database layer overview
- 📊 Component hierarchy tree
- 🚀 API routes map
- 🔑 Key utilities reference
- 🎭 Flavor text system
- 🔄 User journey flows

**Read this if you're asking:**
- "How does the whole system work?"
- "What happens when evidence is submitted?"
- "How are scores calculated?"
- "What are all these lib/ files for?"

---

### 🧩 [COMPONENT_MAP.md](COMPONENT_MAP.md) - **React Components**
**Best for:** Working with UI, React components, frontend development

**Contains:**
- 📋 All components listed by purpose
- 🎯 Component hierarchy diagrams
- 🎨 RottenScoreMeter deep dive (with visual structure)
- 📊 CategoryBreakdown details
- 📝 EvidenceUpload form flow
- 🌟 RatingStars component
- 🔧 Client-side utilities
- 🐛 Debug components
- 📦 Component dependencies graph
- 🎨 Styling approach

**Read this if you're asking:**
- "How do I display a score?"
- "Which component should I use?"
- "How does the evidence form work?"
- "What props does this component need?"

---

### 🚀 [API_GUIDE.md](API_GUIDE.md) - **Backend & APIs**
**Best for:** Working with API routes, backend logic, data operations

**Contains:**
- 📍 Complete API routes map
- 🔄 Evidence submission flow (detailed)
- 📊 Score recalculation process
- 📋 Rotten index (leaderboard) API
- 🔐 Authentication flow
- 🖼️ Open Graph image generation
- 📧 Email notifications
- 🔍 Request/response examples
- 🔒 Auth & authorization
- ⚡ Rate limiting
- 🐛 Error handling
- 📊 Performance targets

**Read this if you're asking:**
- "How do I add an API endpoint?"
- "What does this API route do?"
- "How does evidence submission work on the backend?"
- "How are scores recalculated?"

---

## 🎨 Visual Elements Guide

Throughout the codebase and documentation, we use consistent visual markers:

### Documentation Symbols
```
═══  Section dividers (major sections)
───  Subsection dividers
┌─┐  Box/container borders
│    Vertical connections
└─┘  Box/container borders
▼ →  Flow indicators
```

### Emoji Categories
```
🎯  Core/important concept
📊  Data/statistics
🔄  Process/flow
🎨  Visual/design
🔧  Tools/utilities
📝  Forms/input
🐛  Debugging
🔐  Security/auth
📁  Files/directories
🚀  APIs/routes
👥  Labor/workplace
🌍  Environmental
🛒  Consumer
⚖️  Governance
🏘️  Social
🏷️  Brand
```

### Code Comment Markers
```typescript
// ═══════════════════════════════════════════════════════
//                  MAJOR SECTION HEADER
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────
// Subsection header
// ─────────────────────────────────────────────────────

/**
 * Visual flow diagrams in block comments
 * 
 *   Input
 *     ↓
 *   Process
 *     ↓
 *   Output
 */
```

---

## 🗺️ Documentation Map

### By Role

**👨‍💻 Frontend Developer**
1. Start: QUICKSTART.md (basics)
2. Deep dive: COMPONENT_MAP.md (React)
3. Reference: ARCHITECTURE.md (how components fit together)

**👩‍💻 Backend Developer**
1. Start: QUICKSTART.md (basics)
2. Deep dive: API_GUIDE.md (routes & flows)
3. Reference: ARCHITECTURE.md (data flow)

**🎨 Designer**
1. COMPONENT_MAP.md (UI components)
2. ARCHITECTURE.md (visual system section)

**📊 Data/Analytics**
1. ARCHITECTURE.md (scoring system)
2. lib/rotten-score.ts (code with visual diagrams)

**🆕 New Contributor**
1. QUICKSTART.md (start here!)
2. ARCHITECTURE.md (understand the system)
3. Then: COMPONENT_MAP or API_GUIDE based on your task

---

## 📂 Where to Find Visual Diagrams

### In Documentation Files
- **ARCHITECTURE.md**: Project structure tree, data flow, scoring flow, user journeys
- **COMPONENT_MAP.md**: Component hierarchy, form structure, data flow
- **API_GUIDE.md**: API flow diagrams, request/response examples
- **QUICKSTART.md**: Quick reference diagrams, learning paths

### In Source Code
- **lib/rotten-score.ts**: Complete scoring algorithm with visual flow, weight distributions
- **lib/flavor-engine.ts**: Color/tier mapping (has section headers)
- **components/\*.tsx**: Many have structure diagrams in comments

---

## 🔍 Search Tips

### Find by Feature
```bash
# Evidence submission
grep -r "evidence" ARCHITECTURE.md COMPONENT_MAP.md API_GUIDE.md

# Scoring algorithm
grep -r "score" ARCHITECTURE.md API_GUIDE.md
grep -r "calculate" lib/rotten-score.ts

# Components
grep -r "RottenScoreMeter" COMPONENT_MAP.md
```

### Find Visual Diagrams
```bash
# ASCII art diagrams
grep -r "┌─" *.md lib/*.ts

# Flow charts
grep -r "▼" *.md lib/*.ts

# Section headers
grep -r "═══" *.md lib/*.ts
```

---

## 🎓 Learning Paths

### Path 1: Quick Start (30 minutes)
1. Read **QUICKSTART.md** (15 min)
2. Skim **ARCHITECTURE.md** "Project Structure" section (10 min)
3. Browse a component file (5 min)

### Path 2: Frontend Development (2 hours)
1. Read **QUICKSTART.md** (15 min)
2. Read **COMPONENT_MAP.md** completely (45 min)
3. Read **ARCHITECTURE.md** "Component Hierarchy" section (20 min)
4. Explore component files with code editor (40 min)

### Path 3: Backend Development (2 hours)
1. Read **QUICKSTART.md** (15 min)
2. Read **API_GUIDE.md** completely (45 min)
3. Read **ARCHITECTURE.md** "Data Flow" section (20 min)
4. Explore API route files (40 min)

### Path 4: Full Stack Understanding (4 hours)
1. Read **QUICKSTART.md** (20 min)
2. Read **ARCHITECTURE.md** completely (60 min)
3. Read **COMPONENT_MAP.md** completely (45 min)
4. Read **API_GUIDE.md** completely (45 min)
5. Read visual diagrams in lib/rotten-score.ts (30 min)
6. Trace evidence submission end-to-end in code (40 min)

---

## 📊 Documentation Coverage

```
Feature Area          Documented In
─────────────────────────────────────────────────────────
Project Setup         QUICKSTART.md
Architecture          ARCHITECTURE.md
Data Flow             ARCHITECTURE.md, API_GUIDE.md
Scoring Logic         ARCHITECTURE.md, lib/rotten-score.ts
React Components      COMPONENT_MAP.md
API Routes            API_GUIDE.md
Database              ARCHITECTURE.md
Authentication        API_GUIDE.md
Visual Design         COMPONENT_MAP.md, QUICKSTART.md
Testing               (To be added)
Deployment            (To be added)
```

---

## 🔄 Keep Documentation Updated

When making code changes, consider updating:

**Changed scoring algorithm?**
→ Update visual diagrams in `lib/rotten-score.ts`
→ Update flow in `ARCHITECTURE.md`

**Added new component?**
→ Add to `COMPONENT_MAP.md` with usage example

**Added new API route?**
→ Add to `API_GUIDE.md` with flow diagram

**Changed a common workflow?**
→ Update relevant section in `QUICKSTART.md`

---

## 💡 Documentation Philosophy

Our visual documentation follows these principles:

1. **Show, Don't Just Tell**: Use diagrams, trees, and visual flows
2. **Multiple Entry Points**: Different docs for different needs
3. **Progressive Detail**: Quick start → Architecture → Deep dive
4. **Code as Documentation**: Visual comments in source files
5. **Maintain Currency**: Update docs with code changes

---

## 🆘 Still Can't Find What You Need?

**Try This Approach:**
1. Start with **QUICKSTART.md** "Find What You Need" section
2. Use the search function in your editor across all `.md` files
3. Check the source code file directly - most have good comments
4. Grep for visual markers: `grep -r "═══" .`

**Common Questions:**

> "How do I add a new category?"

See ARCHITECTURE.md (scoring system) and lib/rotten-score.ts (CATEGORY_WEIGHTS)

> "How do I change the score meter color?"

See COMPONENT_MAP.md (RottenScoreMeter) and lib/flavor-engine.ts (getScoreColor)

> "How do I add a new API endpoint?"

See API_GUIDE.md (API Routes Map section) and existing routes in app/api/

> "Where's the database schema?"

See ARCHITECTURE.md (Database Layer section)

---

## 📝 Documentation Files Summary

| File | Size | Purpose | Read Time |
|------|------|---------|-----------|
| **QUICKSTART.md** | ~10KB | Fast reference, getting started | 5-10 min |
| **ARCHITECTURE.md** | ~17KB | System design, full overview | 20-30 min |
| **COMPONENT_MAP.md** | ~13KB | React components guide | 15-25 min |
| **API_GUIDE.md** | ~20KB | API routes & backend | 20-30 min |
| **DOCS_INDEX.md** | This file | Documentation map | 5 min |

**Total: ~4 hours to read everything thoroughly**
**Quick start: 30 minutes (QUICKSTART.md + skim others)**

---

**Ready to start? → [QUICKSTART.md](QUICKSTART.md) 🚀**

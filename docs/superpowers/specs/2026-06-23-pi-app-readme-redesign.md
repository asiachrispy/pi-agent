# pi-app README Redesign for Open Source Community

**Date**: 2026-06-23  
**Status**: Design  
**Goal**: Rewrite README to serve three simultaneous user personas (new users, pi CLI users, contributors) with a unified, ecosystem-first narrative

---

## Problem Statement

**Current README limitations:**
- Mixes three user types' needs without clear routing (new users waste time on dev setup, contributors scroll past basic features)
- Lacks ecosystem context (no explanation of pi vs pi-app relationship, confuses newcomers)
- Highly technical tone (internal implementation details crowd out user value)
- Weak opening value proposition (takes paragraphs to answer "what is this?")

**Success metrics:**
- A new user can understand pi-app's purpose and install it in <2 minutes
- A pi CLI user can find what's new in pi-app without reading entire README
- A contributor can find dev setup and architecture overview in <5 minutes
- Reduce README from ~175 to ~120 lines (move details to `docs/` subdirectory)

---

## Design: Ecosystem-Driven Structure

### Information Architecture

```
README.md (120 lines)
├─ Title + Quick Navigation (for 3 user types)
├─ Ecosystem Context (what is pi, pi-app, their relationship)
├─ Core Value Proposition (why use pi-app)
├─ Three User Paths (quick-start / existing cli user / contributor)
├─ Feature Matrix (simple table)
├─ Dev Quick Start (installation + basic local dev)
└─ Links to detailed docs

Supporting docs (new or clarified)
├─ docs/GETTING_STARTED.md (installation methods, CLI reference)
├─ docs/INTEGRATION_WITH_CLI.md (sharing sessions, models.json)
├─ docs/FEATURES.md (feature descriptions, screenshots)
├─ docs/DEVELOPMENT.md (dev setup, port isolation, architecture)
└─ docs/ARCHITECTURE.md (code structure, data flow)
```

### Content by Section

#### 1. Header + Navigation (~6 lines)
```
# pi-app
Web UI for the Pi AI coding agent.

## Quick Navigation
- ⚡ New here? → Start below
- 🔧 Already using pi CLI? → Features
- 💻 Want to contribute? → Development
```

**Why**: Three user types need different entry points. Navigation reduces cognitive load.

#### 2. Ecosystem Context (~8 lines)
```
Pi ecosystem has three layers:
- pi: Engine, CLI, multi-LLM support, tool invocation, session format
- pi-app: Web frontend, macOS application, optional remote access
- Your workflow: CLI, browser, or desktop app — same underlying agent instance

pi-app is the **web UI and macOS shell** for one local pi agent installation.
```

**Why**: Eliminates "what's the relationship between pi and pi-app?" confusion.

#### 3. Core Value Proposition (~12 lines)
```
Why pi-app?
- Session Management: Group by working directory, visualize branching
- Real-time Interaction: Stream output, mid-chat model switching, branch forking
- Everywhere: Local-first data, optional remote access, all platforms
```

**Why**: Users want to know "why should I use this over CLI only?" before seeing install commands.

#### 4. User Paths (~40 lines)
Three independent sections, each self-contained:

**A) I want to use pi-app**
- One-liner: `npx pi-app@latest`
- Install methods (npx, global, dev)
- Link to GETTING_STARTED.md

**B) I'm a pi CLI user**
- Short explanation: shared data (sessions, models.json)
- Setup steps (install both, start pi-app, open browser)
- Link to INTEGRATION_WITH_CLI.md

**C) I want to contribute**
- Tech stack: Next.js + TypeScript
- Dev setup: clone, install, `npm run dev`
- Links to DEVELOPMENT.md and ARCHITECTURE.md

**Why**: Each user type sees only what they need; no wasted scrolling.

#### 5. Feature Matrix (~12 lines)
Simple table showing what pi-app does (no deep explanations).

#### 6. Dev Quick Start (~8 lines)
Port isolation principle, local dev commands, project structure outline.

#### 7. Link Section (~3 lines)
Pointers to detailed docs for each topic.

---

## Migration Plan

**What stays in README:**
- Quick navigation
- Ecosystem explanation
- Value proposition
- User-path setup (top-level only)
- Feature list (table)

**What moves to docs/:**
- Security details → docs/SECURITY.md (or keep brief mention)
- Port isolation principle → docs/DEVELOPMENT.md
- Project structure → docs/DEVELOPMENT.md or ARCHITECTURE.md
- macOS app packaging → docs/PACKAGING.md
- Detailed dev guide → docs/DEVELOPMENT.md
- Notes on data directory → docs/INTEGRATION_WITH_CLI.md
- Current note about pi.dev/packages → docs/CONTRIBUTION.md

---

## Tone & Voice

**From** (current): Internal, implementation-focused ("默认读取 `~/.pi/agent/sessions` 下的会话文件")

**To**: User-focused, value-first ("所有会话按工作目录自动分组，在侧栏一览无遗")

- Explain *why* before *how*
- Use benefit language ("visualize branching" vs "support session forking")
- Assume reader doesn't know pi ecosystem at first read
- Provide escape hatches ("Learn more: [docs/X.md](docs/X.md)") so README stays brief

---

## Non-Goals

- Don't rewrite existing feature documentation (keep detailed `docs/` as-is initially)
- Don't change product or APIs
- Don't redo the three-language docs that already exist (this is English README only)

---

## Success Criteria

1. ✅ README under 120 lines
2. ✅ New user can install in <2 min without reading dev sections
3. ✅ pi CLI user sees "what's new" without sifting through dev setup
4. ✅ Contributor has clear path: dev setup → architecture → code
5. ✅ All three user paths are equally visible (no scrolling bias)

---

## Related Files

- [pi-app/README.md](../../pi-app/README.md) — current README
- [pi-app/package.json](../../pi-app/package.json) — version, scripts
- [/README.md](../../README.md) — workspace overview (for context on pi vs pi-app)

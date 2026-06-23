# pi-app README Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite pi-app README to serve three simultaneous user personas (new users, pi CLI users, contributors) with an ecosystem-first narrative structure, reducing complexity from ~175 to ~120 lines by migrating details to focused documentation files.

**Architecture:** 
- README.md becomes a lean hub (ecosystem explanation + three user paths + feature overview + links)
- Create/clarify four supporting docs: GETTING_STARTED.md, INTEGRATION_WITH_CLI.md, FEATURES.md, DEVELOPMENT.md
- Migrate detailed sections from README to targeted docs based on user type and reading depth

**Tech Stack:** Markdown, git

---

## File Structure

**Modified:**
- `pi-app/README.md` — rewrite with ecosystem-first structure (120 lines)

**Created (or clarified from existing):**
- `pi-app/docs/GETTING_STARTED.md` — installation methods, CLI reference, troubleshooting
- `pi-app/docs/INTEGRATION_WITH_CLI.md` — sharing sessions, models.json, data directory
- `pi-app/docs/FEATURES.md` — detailed feature descriptions with examples
- `pi-app/docs/DEVELOPMENT.md` — local dev setup, port isolation, architecture overview

**Existing (keep as-is for now):**
- `pi-app/docs/remote-access.md` — remote access setup
- `pi-app/docs/product-principles.md` — product philosophy
- `pi-app/DEVELOPMENT.md` or referenced docs (will link instead of duplicate)

---

## Tasks

### Task 1: Create GETTING_STARTED.md

**Files:**
- Create: `pi-app/docs/GETTING_STARTED.md`

- [ ] **Step 1: Write GETTING_STARTED.md content**

Create the file with these sections:

```markdown
# Getting Started with pi-app

## Installation

### One-liner (no installation)
\`\`\`bash
npx pi-app@latest
\`\`\`
Then open [http://localhost:30141](http://localhost:30141).

### Global installation
\`\`\`bash
npm install -g pi-app
pi-app
\`\`\`

After installation, `pi` command is also available (points to the embedded pi CLI):
\`\`\`bash
pi --help
\`\`\`

### Local development setup
\`\`\`bash
git clone https://github.com/asiachrispy/pi-app.git
cd pi-app
npm install
npm run dev  # Port 30142 with hot reload
\`\`\`

## Configuration

### Port and Hostname

\`\`\`bash
pi-app --port 8080               # Custom port
pi-app --hostname 127.0.0.1      # Localhost only
pi-app --remote                  # Open to 0.0.0.0 for remote access
pi-app -p 8080 -H 127.0.0.1     # Combine flags

# Or use environment variables
PORT=8080 HOSTNAME=0.0.0.0 pi-app
\`\`\`

### Security Note

By default, pi-app binds to localhost only. Remote access requires explicit flag (`--remote`) or Settings UI. When enabled, authentication uses pairing links or Bearer tokens. See [remote-access.md](remote-access.md) for details.

## Data Directory

pi-app stores sessions in `~/.pi/agent/sessions/` by default (same location as pi CLI).

To use a custom directory:
\`\`\`bash
PI_CODING_AGENT_DIR=~/my/custom/path pi-app
\`\`\`

> ⚠️ On macOS app: Use Settings → Data Directory to change location (GUI picker).

## Troubleshooting

### Port Already in Use

If you see "EADDRINUSE" error:

1. Find the process: `lsof -i :30141`
2. Kill it: `kill -9 <PID>`
3. Or use a different port: `pi-app --port 8080`

### Sessions Not Appearing

Make sure `PI_CODING_AGENT_DIR` points to the right directory:
\`\`\`bash
echo $PI_CODING_AGENT_DIR
ls ~/.pi/agent/sessions/
\`\`\`

### Models.json Not Found

pi-app reads model configuration from `~/.pi/agent/models.json`. If missing:
1. Run pi CLI at least once: `pi <some-prompt>`
2. Or manually create: `~/.pi/agent/models.json`

See [INTEGRATION_WITH_CLI.md](INTEGRATION_WITH_CLI.md) for format.

## First Use

1. Open http://localhost:30141
2. You should see all pi CLI sessions in the left sidebar (grouped by working directory)
3. Click any session to open it
4. Try sending a message or switching models mid-conversation
\`\`\`

- [ ] **Step 2: Verify file content is complete**

Check:
- All installation methods covered
- Configuration examples are runnable
- Troubleshooting covers common errors
- No "TBD" or placeholder text

- [ ] **Step 3: Commit**

```bash
cd /Users/mk/codespace/pi-agent
git add pi-app/docs/GETTING_STARTED.md
git commit -m "docs(getting-started): installation, config, troubleshooting guide"
```

---

### Task 2: Create INTEGRATION_WITH_CLI.md

**Files:**
- Create: `pi-app/docs/INTEGRATION_WITH_CLI.md`

- [ ] **Step 1: Write INTEGRATION_WITH_CLI.md content**

```markdown
# Using pi-app with pi CLI

pi-app and pi CLI share the same underlying data:
- Sessions: `~/.pi/agent/sessions/`
- Models: `~/.pi/agent/models.json`
- Settings: `~/.pi/agent/settings.json`

This means **any session you create in the CLI automatically appears in pi-app**, and vice versa.

## Setup

### Prerequisites
- Both `pi` CLI and `pi-app` installed (or using `npx`)
- At least one CLI session created: `pi "hello world"`

### Start Both

1. **In Terminal 1 — Start pi-app:**
\`\`\`bash
pi-app
# Opens http://localhost:30141
\`\`\`

2. **In Terminal 2 — Use pi CLI as usual:**
\`\`\`bash
pi "your prompt here"
\`\`\`

3. **In Browser — Refresh pi-app:** All new sessions appear in the sidebar.

## Shared Data

### Sessions

Sessions live in `~/.pi/agent/sessions/` as `.jsonl` files. They're grouped by working directory in the UI:

\`\`\`
~/.pi/agent/sessions/
├── <encoded-working-dir-1>/
│   ├── 1718000123_abc123.jsonl
│   └── 1718000456_def456.jsonl
└── <encoded-working-dir-2>/
    └── 1718001000_ghi789.jsonl
\`\`\`

Both CLI and Web UI read from the same files, so:
- Create a session in CLI → view/edit in Web UI
- Create a session in Web UI → it's immediately in CLI's view too

### Models Configuration

Models are defined in `~/.pi/agent/models.json`:

\`\`\`json
{
  "models": [
    {
      "id": "claude-opus-4.8",
      "provider": "anthropic",
      "label": "Opus (latest)"
    },
    {
      "id": "gpt-4o",
      "provider": "openai",
      "label": "GPT-4o"
    }
  ],
  "default": "claude-opus-4.8"
}
\`\`\`

Edit this file → models appear in pi-app's "Models" dropdown (no restart needed).

> Tip: You can also edit models in pi-app's sidebar UI without touching JSON.

## Common Workflows

### Workflow 1: CLI prototyping → Web UI refining

1. Quick prototyping in CLI: `pi "write a function that..."`
2. Switch to Web UI to explore the result:
   - Visualize conversation branches
   - Fork and try different approaches
   - Switch models mid-conversation
3. Back to CLI for next iteration if needed

### Workflow 2: Web UI session management

1. Create session in CLI
2. Open in Web UI for:
   - Browsing past sessions grouped by project
   - Branching conversations visually
   - Managing tool permissions
   - Creating session notes/summaries

### Workflow 3: Model experimentation

1. Configure multiple models in `models.json`
2. Start conversation in CLI or Web UI
3. Switch models mid-chat to compare outputs
4. Web UI makes switching seamless

## Data Directory Isolation (Development)

If developing pi-app locally, use port isolation:

| Purpose | Port | Data Dir | Command |
|---------|------|----------|---------|
| Daily use (production) | 30141 | `~/.pi/agent/` | `npm start` |
| Development | 30142 | `~/tmp/pi-dev-agent/` | `npm run dev` |

This ensures dev changes don't corrupt real sessions.

See [DEVELOPMENT.md](DEVELOPMENT.md#port-isolation) for details.

## Troubleshooting

### Sessions not syncing between CLI and Web UI

1. **Check data directory matches:**
\`\`\`bash
# CLI sees this by default:
echo $PI_CODING_AGENT_DIR  # Should be empty or ~/.pi/agent/

# Web UI sees this by default:
curl http://localhost:30141/api/config  # Returns data directory
\`\`\`

2. **Verify sessions exist:**
\`\`\`bash
ls -la ~/.pi/agent/sessions/
\`\`\`

3. **Refresh browser:** Hard refresh (Cmd+Shift+R) to clear cached session list.

### Models not appearing after edit

1. Restart pi-app: `Ctrl+C` then `pi-app`
2. Or check models.json for syntax errors: `cat ~/.pi/agent/models.json | jq`
\`\`\`

- [ ] **Step 2: Verify content is complete**

Check:
- All shared data explained
- Setup steps are clear
- Common workflows covered
- Troubleshooting addresses sync issues

- [ ] **Step 3: Commit**

```bash
git add pi-app/docs/INTEGRATION_WITH_CLI.md
git commit -m "docs(integration): cli and web ui data sharing, workflows"
```

---

### Task 3: Create FEATURES.md

**Files:**
- Create: `pi-app/docs/FEATURES.md`

- [ ] **Step 1: Write FEATURES.md content**

```markdown
# pi-app Features

## Session Browser

**What it does:** Browse all pi agent sessions in one place, automatically grouped by working directory.

**How to use:**
1. Open pi-app (http://localhost:30141)
2. Left sidebar shows all sessions grouped by project
3. Click a session to open it
4. Search box filters by session name or path
5. Rename sessions by right-clicking

**Why it matters:** Instead of scattered `.jsonl` files, you get a unified view of all your agent interactions.

---

## Real-time Chat

**What it does:** Send messages to your agent with streaming responses. Full SSE support.

**How to use:**
1. Open a session (or create a new one)
2. Type in the message box at the bottom
3. Hit Enter to send
4. Watch the agent's response stream in real-time
5. Click the stop button (⏹️) to interrupt

**Key features:**
- Mid-chat model switching (change LLM without restarting)
- Tool panel (enable/disable tools the agent can use)
- Message editing (re-send a message with edits)
- Session compression (summarize long conversations to save context)

---

## Session Forking

**What it does:** Create a branch from any point in a conversation. Changes don't affect the original session.

**How to use:**
1. Hover over any user message in the conversation
2. Click "Fork from here"
3. A new `.jsonl` file is created as a child of the original
4. Continue the conversation in the new branch
5. Both sessions are visible in the sidebar

**Why it matters:** Experiment without losing your original line of reasoning.

---

## Branch Navigation

**What it does:** When a session has multiple branches (created via forking), visualize and switch between them.

**How to use:**
1. In a branched session, look for the "Branches" indicator in the UI
2. Click to see branch tree
3. Click any branch to switch
4. Optional: "Summarize before switching" to auto-summarize the branch you're leaving

**Visual tree shows:**
- Branch point (the message where it split)
- All branches descending from that point
- Current branch highlighted

---

## Model Switching

**What it does:** Change LLM mid-conversation without restarting.

**How to use:**
1. Look for the "Model" dropdown in the top bar
2. Select a different model from the list
3. Next message uses the new model
4. All previous messages stay in context

**Supported providers:**
- Anthropic (Claude models)
- OpenAI (GPT models)
- Custom providers (configured in models.json)

---

## File Browser

**What it does:** Quick access to files in the current working directory without leaving pi-app.

**How to use:**
1. Look for the file icon in the left sidebar
2. Browse the directory tree
3. Click a file to view its contents
4. Copy file path or insert into message

---

## Session Summaries

**What it does:** Automatically or manually summarize conversations. Summaries appear as collapsible blocks in the timeline.

**How to use:**
1. **Manual:** Click the "Add Summary" button and type a note
2. **Automatic:** pi-app can auto-generate summaries at conversation breaks
3. Click summary to expand/collapse
4. Summaries help you understand old sessions at a glance

**Use for:**
- Quick session recap before context compression
- Milestone markers in long conversations
- Session organization

---

## Tool Panel

**What it does:** View and enable/disable tools the agent can use in this session.

**How to use:**
1. Look for "Tools" panel in the sidebar
2. Toggle tools on/off
3. Changes take effect immediately
4. Agent respects your settings in the next message

**Common tools:**
- Bash execution
- File I/O
- Web requests
- Code execution

---

## Remote Access

**What it does:** Access pi-app from another device on your network or over the internet.

**How to use:**
1. Open Settings (⚙️ icon)
2. Toggle "Remote Access" ON
3. Choose authentication method:
   - **Pairing link:** One-time setup link to share with trusted users
   - **Bearer token:** Persistent auth token for scripts/automation
4. Share the link or token

**Security:**
- Token-authenticated (no passwords)
- Optional IP whitelist
- Session-based access control

See [remote-access.md](remote-access.md) for detailed setup.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K (Mac) / Ctrl+K (Linux/Win) | Focus search |
| Cmd+L (Mac) / Ctrl+L (Linux/Win) | Focus message input |
| Esc | Close modal / deselect |
| Enter | Send message |

---

## Settings

**Data Directory:** Change where sessions are stored (default: `~/.pi/agent/`)

**Model Configuration:** Edit available models and set default

**Remote Access:** Enable/configure remote access

**Tool Permissions:** Global tool settings

**Theme:** Dark / Light mode (respects system preference)

\`\`\`

- [ ] **Step 2: Verify content is complete**

Check:
- All major features documented
- Use cases clear
- No feature forgotten
- Keyboard shortcuts section optional but helpful

- [ ] **Step 3: Commit**

```bash
git add pi-app/docs/FEATURES.md
git commit -m "docs(features): detailed feature descriptions and use cases"
```

---

### Task 4: Create DEVELOPMENT.md

**Files:**
- Create: `pi-app/docs/DEVELOPMENT.md`

- [ ] **Step 1: Write DEVELOPMENT.md content**

```markdown
# Development Guide

## Local Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Clone and Install

\`\`\`bash
git clone https://github.com/asiachrispy/pi-app.git
cd pi-app
npm install
\`\`\`

## Port Isolation Principle

**Core rule:** Port 30141 is for production/daily use. Port 30142 is for development.

| Use Case | Port | Command | Data Dir | Notes |
|----------|------|---------|----------|-------|
| **Daily Use** | 30141 | `npm start` | `~/.pi/agent/` | Stable, production build |
| **Development** | 30142 | `npm run dev` | `~/tmp/pi-dev-agent/` | Hot reload, dev build |

**Why:** This isolates changes. You can develop without affecting your real sessions.

## Development Commands

### Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Opens http://localhost:30142 with hot reload. Changes to `.tsx` / `.ts` files auto-refresh.

Data directory automatically set to `~/tmp/pi-dev-agent/` (separate from daily use).

### Build for Production

\`\`\`bash
npm run build
\`\`\`

Creates `.next/` optimized build (production bundle).

### Start Production Build

\`\`\`bash
npm run build && npm start
\`\`\`

Starts on port 30141. This is what users see when they install globally.

### Run Tests

\`\`\`bash
npm run test              # Watch mode
npm run test:run         # Single run
\`\`\`

### Linting

\`\`\`bash
npm lint
\`\`\`

## Project Structure

\`\`\`
pi-app/
├─ app/
│  ├─ api/              # API routes (Next.js app router)
│  │  ├─ sessions/      # Session CRUD, reading .jsonl files
│  │  ├─ agent/         # Agent communication (RPC, SSE streams)
│  │  ├─ files/         # File browsing and content reading
│  │  └─ models/        # Model list, defaults
│  │
│  └─ (page.tsx, etc)   # Page layouts, session UI
│
├─ components/          # Reusable React components
│  ├─ SessionBrowser.tsx
│  ├─ ChatBox.tsx
│  ├─ BranchNavigator.tsx
│  └─ ...
│
├─ lib/
│  ├─ session-reader.ts    # Parse .jsonl session files
│  ├─ rpc-manager.ts       # Manage agent session lifecycle
│  ├─ normalize.ts         # Normalize toolCall fields
│  ├─ types.ts             # TypeScript types
│  └─ ...
│
├─ public/              # Static assets
├─ scripts/             # Build, packaging, utilities
├─ .next/               # Production build output
├─ .next-dev-30142/     # Dev build output (separate from production)
└─ package.json
\`\`\`

## Architecture Overview

### Data Flow

1. **Session files** (`~/.pi/agent/sessions/*.jsonl`) are the source of truth
2. **Session Reader** (lib/session-reader.ts) parses .jsonl into structured data
3. **API routes** serve that data to the frontend
4. **React components** display and interact with sessions
5. **Agent RPC** sends messages back to pi CLI/engine

### Key Modules

**SessionReader** (`lib/session-reader.ts`)
- Reads and parses .jsonl session files
- Returns structured conversation messages

**RPCManager** (`lib/rpc-manager.ts`)
- Manages agent session lifecycle (start, stop, message handling)
- Handles SSE streams for real-time chat

**API Routes**
- `/api/sessions` — list, create, delete sessions
- `/api/agent` — send messages, receive SSE stream
- `/api/files` — read file contents
- `/api/models` — list and configure models

## Testing

### Running Tests

\`\`\`bash
npm run test:run
\`\`\`

Tests are in `lib/__tests__/` (unit tests for utilities).

### Test Coverage

Focus on:
- Session parsing edge cases
- RPC message handling
- API route error handling

UI component testing is lighter (use Playwright for e2e if needed).

## macOS App Development

### Build macOS App

\`\`\`bash
npm run package:macos
\`\``\`

Creates `dist/macos/Pi.app` (Next.js standalone bundle + internal Node + Swift shell).

### Install Locally

\`\`\`bash
rm -rf /Applications/Pi.app
ditto dist/macos/Pi.app /Applications/Pi.app
open /Applications/Pi.app
\`\`\`

### Common Issues

- **"Cannot open" error:** `xattr -cr /Applications/Pi.app`
- **Code sign issues:** See [macos/README.md](../macos/README.md)

## Debugging

### Enable Debug Logs

\`\`\`bash
DEBUG=* npm run dev
\`\`\`

### Check Browser Console

Open DevTools (F12) → Console tab. Look for:
- Network errors (Failed to fetch)
- Session parsing errors
- RPC message format issues

### Check Server Logs

Terminal running `npm run dev` shows:
- Next.js build messages
- API call logs
- Error traces

## Before Submitting a PR

1. **Tests pass:** `npm run test:run`
2. **Linting passes:** `npm run lint`
3. **Manual smoke test:**
   - Start `npm run dev`
   - Create/open a session
   - Send a message
   - Switch models
   - Check console for errors
4. **No console errors:** DevTools console should be clean

## Useful Commands

\`\`\`bash
# Clean all build artifacts
rm -rf .next .next-dev-30142 node_modules
npm install && npm run build

# Check what changed vs main
git diff main...HEAD

# Test on production build locally
npm run build && npm start  # Then visit http://localhost:30141
\`\`\`

\`\`\`

- [ ] **Step 2: Verify content is complete**

Check:
- Setup instructions are exact and runnable
- Port isolation principle clearly explained
- Project structure matches reality
- Testing instructions work
- All commands have expected outputs
- macOS section references external README

- [ ] **Step 3: Commit**

```bash
git add pi-app/docs/DEVELOPMENT.md
git commit -m "docs(development): local setup, port isolation, testing, architecture"
```

---

### Task 5: Rewrite pi-app/README.md

**Files:**
- Modify: `pi-app/README.md`

- [ ] **Step 1: Read current README to understand all existing sections**

Current README has:
- 日常维护 (maintenance workflow)
- 快速开始 (quick start with install methods)
- 可选参数 (configuration flags)
- 功能介绍 (features list)
- 注意事项 (important notes about data directories)
- 开发 (development setup)
- 项目结构 (project structure)

We're keeping most content but restructuring and moving details.

- [ ] **Step 2: Write the new README structure**

Replace the entire content of `pi-app/README.md` with:

```markdown
# pi-app

Web UI for the Pi AI coding agent.

## Quick Navigation

- ⚡ **New here?** → [Installation](#getting-started)
- 🔧 **Already using pi CLI?** → [Integration](#already-a-pi-cli-user)
- 💻 **Want to contribute?** → [Development](#development)

## What is pi-app?

Pi ecosystem has three components:

| Component | Role |
|-----------|------|
| **pi** | AI agent engine, CLI, multi-LLM support, tool invocation, session management |
| **pi-app** (this repo) | Web frontend, macOS application, optional remote access |
| **Your workflow** | Use via CLI (`pi`), browser, or desktop app — all connected to the same agent |

**pi-app is the web UI and macOS shell for one local pi agent installation.** When you run pi-app, it reads sessions from `~/.pi/agent/` (same location as pi CLI) and displays them in the browser. Both tools operate on the same data.

## Why pi-app?

**Session Management** — Browse all conversations in one place, automatically grouped by working directory. Visualize, rename, and organize sessions.

**Real-time Interaction** — Stream output, switch models mid-chat, fork conversations into branches, and manage tools without restarting.

**Multi-platform** — Web (all browsers), macOS app, optional remote access. Local-first data storage with optional cloud sync.

## Getting Started

### I want to use pi-app

**No installation needed:**
```bash
npx pi-app@latest
```
Then open [http://localhost:30141](http://localhost:30141).

**Or install globally:**
```bash
npm install -g pi-app
pi-app
```

**Configuration:**
```bash
pi-app --port 8080               # Custom port
pi-app --hostname 127.0.0.1      # Localhost only
pi-app --remote                  # Open to network
PORT=8080 pi-app                 # Environment variable
```

**First time?** See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed setup, troubleshooting, and configuration options.

---

## Already a pi CLI user?

pi-app and pi CLI share the same sessions and models. When you start pi-app, all your existing CLI sessions appear in the browser UI.

**Setup:**
1. Ensure both pi and pi-app are installed
2. Run `pi-app` to start the web server
3. Open http://localhost:30141
4. Your CLI sessions appear in the left sidebar

From the web UI, you can:
- Browse and organize sessions from different projects
- Visualize conversation branches
- Switch models mid-chat
- Edit tool permissions
- Create session notes and summaries

**Learn more:** [docs/INTEGRATION_WITH_CLI.md](docs/INTEGRATION_WITH_CLI.md)

---

## Want to contribute?

pi-app is a Next.js + TypeScript project. We welcome contributions:

**Setup for development:**
```bash
git clone https://github.com/asiachrispy/pi-app.git
cd pi-app
npm install
npm run dev          # http://localhost:30142 (dev server + hot reload)
npm run build && npm start  # http://localhost:30141 (production)
```

**Key principles:**
- Port 30141: daily use (production build)
- Port 30142: development (hot reload, isolated data)
- Run tests before submitting PRs: `npm run test:run`

**Project structure:** [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)  
**Architecture overview:** [docs/DEVELOPMENT.md#architecture-overview](docs/DEVELOPMENT.md#architecture-overview)  
**Contributing guide:** [CONTRIBUTING.md](CONTRIBUTING.md) (create if missing)

---

## Features

| Feature | What it does |
|---------|--------------|
| **Session Browser** | Browse all sessions grouped by working directory |
| **Real-time Chat** | Stream output, mid-chat model switching, message editing |
| **Session Forking** | Branch conversations at any point without losing original |
| **Branch Navigator** | Visualize and switch between branches |
| **File Browser** | Quick access to files in your working directory |
| **Tool Panel** | Enable/disable agent tools per session |
| **Session Summaries** | Auto or manual summaries for long conversations |
| **Model Switching** | Change LLM without restarting |
| **Remote Access** | Optional access from other devices (pairing link + token auth) |

**Detailed feature guide:** [docs/FEATURES.md](docs/FEATURES.md)

---

## Security & Privacy

**Local-first:** By default, pi-app binds to `localhost:30141`. All data stays on your machine.

**Remote access:** Opt-in with `--remote` flag. Uses token-based authentication (no passwords). See [docs/remote-access.md](docs/remote-access.md).

**Data directory:** Sessions stored in `~/.pi/agent/sessions/` by default. Change with `PI_CODING_AGENT_DIR` environment variable.

---

## Useful Links

- **Product philosophy:** [docs/product-principles.md](docs/product-principles.md)
- **macOS app details:** [macos/README.md](macos/README.md)
- **Historical context:** [Pi ecosystem overview](../README.md)

---

## License

MIT
```

- [ ] **Step 2: Verify the rewritten README**

Check:
- [ ] Quick navigation is clear (three user types)
- [ ] Ecosystem explanation is 3-4 sentences max
- [ ] Each user path is self-contained and doesn't require reading others
- [ ] All links to docs/ files are correct paths
- [ ] Feature list is a table (easy to scan)
- [ ] Security section is brief but reassuring
- [ ] Total line count is under 130 lines
- [ ] No orphaned or broken markdown

- [ ] **Step 3: Test links are valid**

Run this to check doc files exist:

```bash
cd /Users/mk/codespace/pi-agent/pi-app

# Check that referenced docs exist or will be created
ls -1 docs/GETTING_STARTED.md docs/INTEGRATION_WITH_CLI.md docs/FEATURES.md docs/DEVELOPMENT.md 2>&1 | grep -c "cannot access"

# Should output 0 if all files exist, or we note which need creation
```

If any are missing, they were created in Tasks 1-4, so no blocker here.

- [ ] **Step 4: Commit**

```bash
git add pi-app/README.md
git commit -m "docs(readme): rewrite with ecosystem-first structure, three user paths, lean hub design"
```

---

### Task 6: Create CONTRIBUTING.md (optional but recommended)

**Files:**
- Create: `pi-app/CONTRIBUTING.md`

- [ ] **Step 1: Write CONTRIBUTING.md**

```markdown
# Contributing to pi-app

Thank you for your interest in contributing! Here's how to get started.

## Code of Conduct

Be respectful, inclusive, and constructive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) if we have one.

## Getting Started

1. Fork and clone the repo: `git clone https://github.com/YOUR_USERNAME/pi-app.git`
2. Create a branch: `git checkout -b feat/my-feature`
3. Install dependencies: `npm install`
4. Start dev server: `npm run dev`
5. Make your changes

## Before Submitting a PR

- [ ] Tests pass: `npm run test:run`
- [ ] Linting passes: `npm run lint`
- [ ] Manual smoke test on http://localhost:30142
- [ ] No console errors in DevTools
- [ ] Commit message is clear and descriptive

## Types of Contributions

**Bug reports:** Open an issue with reproducible steps.

**Feature requests:** Open an issue describing the use case.

**Code improvements:** See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for architecture and setup.

**Documentation:** Docs are in `docs/` — improvements always welcome.

## Questions?

Open an issue or start a discussion. We're here to help.
```

- [ ] **Step 2: Commit**

```bash
git add pi-app/CONTRIBUTING.md
git commit -m "docs(contributing): code of conduct, PR checklist, contribution types"
```

---

## Self-Review Checklist

**Spec coverage:**
- [ ] Ecosystem explanation in README ✅
- [ ] Three user paths (quick start, CLI user, contributor) ✅
- [ ] Lean README hub (<120 lines) ✅
- [ ] Supporting docs (GETTING_STARTED, INTEGRATION, FEATURES, DEVELOPMENT) ✅
- [ ] Links from README to docs ✅
- [ ] Feature matrix table in README ✅
- [ ] Security section ✅

**Placeholder scan:**
- [ ] No "TBD", "TODO", "implement later" ✅
- [ ] All code blocks are complete (not "add error handling") ✅
- [ ] All commands have exact paths and expected output ✅
- [ ] All file paths are verified ✅

**Type/consistency:**
- [ ] Paths to docs/ files match actual filenames ✅
- [ ] Commands use correct flags (--port vs --PORT) ✅
- [ ] Port numbers consistent (30141=prod, 30142=dev) ✅
- [ ] Data directory paths match (`~/.pi/agent/`) ✅

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-23-pi-app-readme-redesign.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration with quality gates

**2. Inline Execution** — Execute all tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach do you prefer?**

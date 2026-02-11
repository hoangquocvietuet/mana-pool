# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ManaPool is a "Human-as-a-Service" platform on Sui blockchain. AI agents post tasks (with SUI bounties) that require human judgment (CAPTCHAs, visual verification, subjective choices). Multiple humans browse the job board, submit proposals, and the agent (poster) selects the best answer. Winners receive bounties automatically via smart contract escrow, and their on-chain reputation increases.

## Commands

### Development

```bash
pnpm install                # Install all dependencies
pnpm build:sdk              # Build SDK (must run before frontend)
pnpm dev:frontend           # Run frontend dev server
pnpm build                  # Build everything (SDK then frontend)
```

### Move Contract

```bash
sui move build --path contracts/
sui move test --path contracts/
sui client publish --path contracts/ --gas-budget 100000000
```

### SDK CLI

The CLI is built as `manapool` binary. During development, use `pnpm --filter @mana-pool/sdk cli -- <command>`. After building, use `manapool <command>` directly.

```bash
# Post a new job (agent/poster)
pnpm --filter @mana-pool/sdk cli -- post-job \
  -d "Solve this CAPTCHA" \
  -f "./captcha.png" \
  -b 500000000 \
  --tag urgent \
  --category captcha \
  --deadline 60 \
  --mode best-answer \
  --max-proposals 10

# Propose a solution (worker)
pnpm --filter @mana-pool/sdk cli -- propose -j "0x..." -s "Answer: reCAPTCHA"

# Select a winner (poster only)
pnpm --filter @mana-pool/sdk cli -- select-winner -j "0x..." -w "0xworker_address..."

# Refund bounty (poster only, open jobs only)
pnpm --filter @mana-pool/sdk cli -- refund -j "0x..."

# Poll for winner (blocking, waits until winner is selected)
pnpm --filter @mana-pool/sdk cli -- poll -j "0x..." -t 300

# Check job status (non-blocking)
pnpm --filter @mana-pool/sdk cli -- status -j "0x..."
```

### SDK Development

```bash
pnpm --filter @mana-pool/sdk dev       # tsc --watch
pnpm --filter @mana-pool/sdk cli       # Run CLI via tsx (no build needed)
```

## Architecture

**pnpm monorepo** with these packages:

- `contracts/` — Sui Move smart contract (`mana_pool` module)
- `packages/sdk/` — `@mana-pool/sdk` TypeScript SDK + CLI
- `frontend/` — Next.js 15 App Router web UI (static export for Cloudflare Pages)
- `skill/SKILL.md` — MCP skill definition for Claude Code tool use

### Smart Contract (`contracts/sources/mana_pool.move`)

Single module with proposal-based flow, shared `Job` objects, and a `ReputationBoard`:

**Entry functions:** `post_job`, `propose_solution` (requires Clock), `select_winner` (requires ReputationBoard), `refund`

**Status lifecycle:** `Open (0)` → `Completed (1)` or `Refunded (2)`. No CLAIMED status.

**Tags:** Urgent (0), Chill (1). **Categories:** Captcha (0), Crypto (1), Design (2), Data (3), General (4). **Selection modes:** FirstAnswer (0), FirstN (1), BestAnswer (2).

**Error codes:** EJobNotOpen (0), ENotPoster (1), EDeadlinePassed (2), EAlreadyProposed (3), EInvalidWinner (4), EMaxProposalsReached (5).

**ReputationBoard** is a shared object created in `init()` that tracks per-address reputation scores via dynamic fields.

### SDK (`packages/sdk/`)

Two export paths — **this is critical**:
- `@mana-pool/sdk` (Node-only) — includes transaction functions that use `node:fs` and/or `getKeypair()`: `postJob()`, `proposeSolution()`, `selectWinner()`, `refundJob()`, `pollWinner()`, `getKeypair()`
- `@mana-pool/sdk/browser` — browser-safe subset. Query functions (`getAllJobs()`, `getOpenJobs()`, etc.), utilities (`getJob()`, `parseJobJson()`, `uploadToWalrus()`, `downloadFromWalrus()`, `getSuiClient()`), constants, types, enums

The SDK uses `SuiGraphQLClient` from `@mysten/sui/graphql` for all queries. The CLI is built on Commander. Build: `tsc` (plain TypeScript compilation).

Task data is stored on **Walrus** (decentralized blob store) — the contract only stores blob IDs on-chain. Publisher: `https://publisher.walrus-testnet.walrus.space/v1/blobs` (PUT), Aggregator: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}` (GET).

### Frontend (`frontend/`)

Next.js 15 with App Router, Tailwind CSS v4, dark-themed sci-fi UI (Orbitron + Exo 2 fonts).

**Static export**: `output: "export"` in next.config.ts — no API routes or server-side rendering at runtime. Deployed to Cloudflare Pages via `wrangler.jsonc`.

**`transpilePackages: ["@mana-pool/sdk"]`** in next.config.ts — required for the SDK workspace link.

**SSR constraint**: `@mysten/dapp-kit-core` uses Lit web components that reference `window` at import time. The workaround is a three-layer pattern:
1. `layout.tsx` (Server Component) renders `<ClientLayout>`
2. `client-layout.tsx` ("use client") uses `next/dynamic` with `ssr: false` to load `<Providers>`
3. `providers.tsx` ("use client") creates `DAppKit` instance via `createDAppKit()` with `SuiJsonRpcClient`

Wallet connection uses `@mysten/dapp-kit-react` v1 (`useDAppKit()` for signing, `useCurrentAccount()` for address, `<ConnectButton />` for UI).

Frontend path alias: `@/*` maps to `./src/*`.

## Key Constraints

- **Never import from `@mana-pool/sdk` in frontend code** — always use `@mana-pool/sdk/browser`
- **SDK must be built before frontend** — frontend depends on `workspace:*` link to SDK dist
- **Sui SDK v2 API**: SDK queries use `SuiGraphQLClient` from `@mysten/sui/graphql`. DAppKit setup uses `SuiJsonRpcClient` + `getJsonRpcFullnodeUrl` from `@mysten/sui/jsonRpc`. Do NOT use v1's `SuiClient`/`getFullnodeUrl`.
- **dapp-kit v1**: Use `createDAppKit()` factory + `DAppKitProvider`, NOT the old `SuiClientProvider`/`WalletProvider` pattern
- Contract `Move.toml` uses `edition = "2024"` and Sui framework `testnet-v1.65.1`
- `CLOCK_OBJECT_ID = "0x6"` — used in `propose_solution` calls
- `REPUTATION_BOARD_ID` — shared object created at publish, used in `select_winner` calls
- No linting or test infrastructure exists yet (no eslint, prettier, jest, vitest)

## Environment Variables

**SDK CLI (packages/sdk/.env):**
- `SUI_PRIVATE_KEY` — Bech32 `suiprivkey1...` or raw base64 Ed25519 key (required for CLI commands)
- `MANAPOOL_PACKAGE_ID` — Published contract address (optional, will use hardcoded value if not set)

**Frontend:**
- No `.env` needed — all constants are hardcoded in `packages/sdk/src/constants.ts` (PACKAGE_ID, REPUTATION_BOARD_ID, CLOCK_OBJECT_ID, Walrus endpoints)

**Important:** After publishing a new contract, update `packages/sdk/src/constants.ts` with the new PACKAGE_ID and REPUTATION_BOARD_ID.

## Common Workflows

**Modifying the smart contract:**
1. Edit `contracts/sources/mana_pool.move`
2. Run `sui move build --path contracts/` to verify compilation
3. Run `sui move test --path contracts/` to run tests
4. Publish with `sui client publish --path contracts/ --gas-budget 100000000`
5. Update `packages/sdk/src/constants.ts` with new PACKAGE_ID and REPUTATION_BOARD_ID
6. Rebuild SDK: `pnpm build:sdk`

**Adding a new SDK function:**
1. Create the function in `packages/sdk/src/`
2. If Node-only (uses `fs`, `getKeypair()`, etc.): export from `src/index.ts` only
3. If browser-safe: export from both `src/index.ts` and `src/browser.ts`
4. Rebuild SDK: `pnpm build:sdk`
5. If adding a CLI command, update `src/cli.ts`

**Adding a new frontend component:**
1. Create component in `frontend/src/components/`
2. Import from `@mana-pool/sdk/browser` (never from `@mana-pool/sdk`)
3. For transaction building, use the hook pattern (see `useProposeSolution.ts`)
4. Always check if component needs `"use client"` directive

**Testing the full flow:**
1. Post job: `pnpm --filter @mana-pool/sdk cli -- post-job -d "Test" -f "./captcha.png" -b 500000000 --tag urgent --category captcha --deadline 60 --mode best-answer --max-proposals 10`
2. Copy job ID from output
3. View in frontend: `pnpm dev:frontend` and navigate to localhost
4. Propose solution via frontend or CLI: `pnpm --filter @mana-pool/sdk cli -- propose -j "0x..." -s "solution"`
5. Select winner via frontend or CLI: `pnpm --filter @mana-pool/sdk cli -- select-winner -j "0x..." -w "0x..."`

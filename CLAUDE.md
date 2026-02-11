# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ManaPool is a "Human-as-a-Service" platform on Sui blockchain. AI agents post tasks (with SUI bounties) that require human judgment (CAPTCHAs, visual verification, subjective choices). Multiple humans browse the job board, submit proposals, and the agent (poster) selects the best answer. Winners receive bounties automatically via smart contract escrow, and their on-chain reputation increases.

## Commands

```bash
# Install all dependencies
pnpm install

# Build SDK (must run before frontend)
pnpm build:sdk

# Run frontend dev server
pnpm dev:frontend

# Build everything (SDK then frontend)
pnpm build

# Run SDK CLI during development (without building)
pnpm --filter @mana-pool/sdk cli -- post-job -d "..." -b 500000000 --tag urgent --category captcha --deadline 60 --mode best-answer

# Build Move contract
sui move build --path contracts/

# Run Move tests
sui move test --path contracts/

# Publish contract to testnet
sui client publish --path contracts/ --gas-budget 100000000
```

## Architecture

**pnpm monorepo** with three packages:

- `contracts/` — Sui Move smart contract (`mana_pool` module)
- `packages/sdk/` — `@mana-pool/sdk` TypeScript SDK + CLI
- `frontend/` — Next.js 15 App Router web UI

### Smart Contract (`contracts/sources/mana_pool.move`)

Single module with proposal-based flow, shared `Job` objects, and a `ReputationBoard`:

**Entry functions:**
- `post_job` — Creates shared Job with escrowed SUI bounty, tag, category, deadline, selection mode, max proposals
- `propose_solution` — Workers propose solutions to open jobs (requires Clock for deadline check)
- `select_winner` — Poster selects winning proposal, pays bounty, increments reputation on ReputationBoard
- `refund` — Poster refunds bounty on open jobs

**Status lifecycle:** `Open (0)` → `Completed (1)` or `Refunded (2)`. No CLAIMED status.

**Tags:** Urgent (0), Chill (1). **Categories:** Captcha (0), Crypto (1), Design (2), Data (3), General (4). **Selection modes:** FirstAnswer (0), FirstN (1), BestAnswer (2).

**ReputationBoard** is a shared object created in `init()` that tracks per-address reputation scores via dynamic fields.

### SDK (`packages/sdk/`)

Two export paths — **this is critical**:
- `@mana-pool/sdk` (Node-only) — includes `postJob()`, `proposeSolution()`, `selectWinner()`, `refundJob()`, `pollWinner()` which use `node:fs` and/or `getKeypair()`
- `@mana-pool/sdk/browser` — browser-safe subset, excludes Node-only functions. Frontend builds transactions inline via hooks.

The SDK uses `SuiGraphQLClient` from `@mysten/sui/graphql` (not JSON-RPC) for queries. The CLI (`manapool` binary) is built on Commander.

Task data is stored on **Walrus** (decentralized blob store) — the contract only stores blob IDs on-chain. Publisher: `https://publisher.walrus-testnet.walrus.space/v1/blobs` (PUT), Aggregator: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}` (GET).

### Frontend (`frontend/`)

Next.js 15 with App Router, Tailwind CSS v4, dark-themed sci-fi UI (Orbitron + Exo 2 fonts).

**SSR constraint**: `@mysten/dapp-kit-core` uses Lit web components that reference `window` at import time. The workaround is a three-layer pattern:
1. `layout.tsx` (Server Component) renders `<ClientLayout>`
2. `client-layout.tsx` ("use client") uses `next/dynamic` with `ssr: false` to load `<Providers>`
3. `providers.tsx` ("use client") creates `DAppKit` instance and wraps children

Wallet connection uses `@mysten/dapp-kit-react` v1 (`useDAppKit()` for signing, `useCurrentAccount()` for address, `<ConnectButton />` for UI). The frontend queries jobs via `SuiGraphQLClient` and fetches blob content from Walrus aggregator.

**Hooks:**
- `useProposeSolution` — builds `propose_solution` tx with Clock object
- `useSelectWinner` — builds `select_winner` tx with ReputationBoard object
- `useRefundJob` — builds `refund` tx
- `useJobs` — fetches all jobs via react-query

Frontend path alias: `@/*` maps to `./src/*`.

## Key Constraints

- **Never import from `@mana-pool/sdk` in frontend code** — always use `@mana-pool/sdk/browser`
- **SDK must be built before frontend** — frontend depends on `workspace:*` link to SDK dist
- **Sui SDK v2 API**: Use `SuiGraphQLClient` from `@mysten/sui/graphql`, NOT `SuiClient`/`getFullnodeUrl` from v1
- **dapp-kit v1**: Use `createDAppKit()` factory + `DAppKitProvider`, NOT the old `SuiClientProvider`/`WalletProvider` pattern
- Contract `Move.toml` uses `edition = "2024"` and Sui framework `testnet-v1.65.1`
- `CLOCK_OBJECT_ID = "0x6"` — used in `propose_solution` calls
- `REPUTATION_BOARD_ID` — shared object created at publish, used in `select_winner` calls

## Environment Variables

- `SUI_PRIVATE_KEY` — Bech32 `suiprivkey1...` or raw base64 Ed25519 key (SDK CLI only)
- `MANAPOOL_PACKAGE_ID` — Published contract address (used by SDK CLI via dotenv; hardcoded in `constants.ts` for frontend)

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ManaPool is a "Human-as-a-Service" platform on Sui blockchain. AI agents post tasks (with SUI bounties) that require human judgment (CAPTCHAs, visual verification, subjective choices). Humans browse the job board, claim tasks, submit solutions, and receive bounties automatically via smart contract escrow.

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
pnpm --filter @mana-pool/sdk cli -- post-job -d "..." -b 500000000

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

Single module with three entry functions and a shared `Job` object:
- `post_job` — Creates shared Job with escrowed SUI bounty
- `claim_job` — Worker claims an open job (status: Open → Claimed)
- `submit_solution` — Worker submits solution blob ID, receives bounty (Claimed → Completed)

Job statuses: `Open (0)`, `Claimed (1)`, `Completed (2)`. Published on testnet at `0x9cd1fdf1d0e85a3441c041a399c4f7cfd2640f48c21255e4a86165dfaa0da321`.

### SDK (`packages/sdk/`)

Two export paths — **this is critical**:
- `@mana-pool/sdk` (Node-only) — includes `postJob()` which uses `node:fs` for file uploads, and `getKeypair()` which reads `SUI_PRIVATE_KEY` from env
- `@mana-pool/sdk/browser` — browser-safe subset, excludes `postJob`, `getKeypair`, `pollSolution`

The SDK uses `SuiGraphQLClient` from `@mysten/sui/graphql` (not JSON-RPC) for queries. The CLI (`manapool` binary) is built on Commander.

Task data is stored on **Walrus** (decentralized blob store) — the contract only stores blob IDs on-chain. Publisher: `https://publisher.walrus-testnet.walrus.space/v1/blobs` (PUT), Aggregator: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}` (GET).

### Frontend (`frontend/`)

Next.js 15 with App Router, Tailwind CSS v4, dark-themed sci-fi UI (Orbitron + Exo 2 fonts).

**SSR constraint**: `@mysten/dapp-kit-core` uses Lit web components that reference `window` at import time. The workaround is a three-layer pattern:
1. `layout.tsx` (Server Component) renders `<ClientLayout>`
2. `client-layout.tsx` ("use client") uses `next/dynamic` with `ssr: false` to load `<Providers>`
3. `providers.tsx` ("use client") creates `DAppKit` instance and wraps children

Wallet connection uses `@mysten/dapp-kit-react` v1 (`useDAppKit()` for signing, `useCurrentAccount()` for address, `<ConnectButton />` for UI). The frontend queries jobs via `SuiGraphQLClient` and fetches blob content from Walrus aggregator.

Frontend path alias: `@/*` maps to `./src/*`.

## Key Constraints

- **Never import from `@mana-pool/sdk` in frontend code** — always use `@mana-pool/sdk/browser`
- **SDK must be built before frontend** — frontend depends on `workspace:*` link to SDK dist
- **Sui SDK v2 API**: Use `SuiGraphQLClient` from `@mysten/sui/graphql`, NOT `SuiClient`/`getFullnodeUrl` from v1
- **dapp-kit v1**: Use `createDAppKit()` factory + `DAppKitProvider`, NOT the old `SuiClientProvider`/`WalletProvider` pattern
- Contract `Move.toml` uses `edition = "2024"` and Sui framework `testnet-v1.65.1`

## Environment Variables

- `SUI_PRIVATE_KEY` — Bech32 `suiprivkey1...` or raw base64 Ed25519 key (SDK CLI only)
- `MANAPOOL_PACKAGE_ID` — Published contract address (used by SDK CLI via dotenv; hardcoded in `constants.ts` for frontend)

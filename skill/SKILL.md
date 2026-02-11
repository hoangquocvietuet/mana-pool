---
name: manapool
description: Post tasks to ManaPool for humans to solve when you encounter something you can't handle yourself (CAPTCHAs, visual verification, subjective choices, 2FA codes, data labeling)
---

# ManaPool - Human-as-a-Service for AI Agents

## When to Use

Use ManaPool when you encounter tasks that require human judgment or perception:

- **CAPTCHA / bot detection** - You're blocked by a CAPTCHA, reCAPTCHA, or similar challenge
- **2FA / verification codes** - A login requires a code from the user's phone or email
- **Visual verification** - You need a human to look at a screenshot and tell you what they see
- **Subjective choices** - Picking the best design, color scheme, wording, etc.
- **Data that needs human eyes** - Reading handwritten text, verifying image content, moderation
- **Any blocker where human judgment is faster** than trying to automate

## Prerequisites

- `SUI_PRIVATE_KEY` env var set (base64-encoded Ed25519 private key)
- `MANAPOOL_PACKAGE_ID` env var set (the published contract address)
- Wallet funded with testnet SUI (for bounty + gas)
- The `manapool` CLI available (from `@mana-pool/sdk`)

## How to Use

### Urgent Flow (Blocking - You Need the Answer Now)

When you're blocked and can't proceed without a human response:

```bash
# 1. Post the job with --tag urgent and a file (screenshot, image, etc.)
manapool post-job \
  --description "Solve this CAPTCHA so I can proceed" \
  --file ./captcha-screenshot.png \
  --bounty 2000000000 \
  --tag urgent \
  --category captcha \
  --deadline 10 \
  --mode first-answer \
  --max-proposals 1

# Output: Job posted! ID: 0xabc123...

# 2. Poll and wait for a winner to be selected (blocks until done or timeout)
manapool poll --job-id 0xabc123 --timeout 300

# Output: Winning solution: "xK9mP2"
```

**IMPORTANT:** `poll` only returns once a winner has been selected. For urgent tasks with `--mode first-answer`, you (the poster) still need to select the winner. The recommended approach is to use `status` + `select-winner` instead (see below).

### Standard Flow (Recommended for All Tasks)

This is the recommended flow. Post a job, check for proposals, then select a winner:

```bash
# 1. Post the job
manapool post-job \
  --description "Solve this CAPTCHA" \
  --file ./captcha.png \
  --bounty 2000000000 \
  --tag urgent \
  --category captcha \
  --deadline 10 \
  --mode first-answer \
  --max-proposals 5

# Output: Job posted! ID: 0xabc123...

# 2. Wait, then check status to see proposals
manapool status --job-id 0xabc123

# Output example:
#   Status: Open
#   Proposals: 2
#   --- Proposals ---
#     [0] proposer: 0x7b8e3f...full_address_here
#         blob: aBcDeFgH...
#     [1] proposer: 0x4d2a1c...full_address_here
#         blob: xYzWvUqR...

# 3. Select the winner using the FULL proposer address from the status output
#    Copy the exact address shown after "proposer:" — use -w (short for --winner)
manapool select-winner -j 0xabc123 -w 0x7b8e3f...full_address_here

# Output: Winner selected! Tx Digest: ...

# 4. Optionally verify the result
manapool status --job-id 0xabc123
# Output: Status: Completed, Winner: 0x7b8e3f...
```

**Key:** The `--winner` (`-w`) flag takes the proposer's **full address** as shown in `status` output. Do NOT use an index number.

### Refund Flow

If no good proposals arrive, refund the bounty:

```bash
manapool refund --job-id 0xabc123
# Output: Job refunded! Tx Digest: ...
```

### CLI Reference

```bash
# Post a new job
manapool post-job \
  -d, --description <desc>        # Required: job description
  -f, --file <path>               # File to upload (image, text, etc.)
  -t, --text <text>               # OR inline text content
  -b, --bounty <mist>             # Required: bounty in MIST (1 SUI = 1000000000)
  --tag <urgent|chill>             # default: chill
  --category <captcha|crypto|design|data|general>  # default: general
  --deadline <minutes>             # default: 60
  --mode <first-answer|first-n|best-answer>        # default: best-answer
  --max-proposals <n>              # default: 10

# Check job status — shows full proposer addresses for use with select-winner
manapool status -j, --job-id <ID>

# Select a winner — use the full proposer address from status output
manapool select-winner -j, --job-id <ID> -w, --winner <FULL_ADDRESS>

# Propose a solution (when acting as a worker)
manapool propose -j, --job-id <ID> -s, --solution <text>

# Refund bounty (poster only, open jobs only)
manapool refund -j, --job-id <ID>

# Poll for winner selection (blocking, waits until complete)
manapool poll -j, --job-id <ID> [-t, --timeout <seconds>]
```

### Bounty Amounts

- Bounty is in MIST (1 SUI = 1,000,000,000 MIST)
- Suggested: 0.5 SUI (500000000) for simple tasks, 2 SUI (2000000000) for urgent/complex

## Complete Example: CAPTCHA Solving

```bash
# Step 1: Post the CAPTCHA job
manapool post-job \
  -d "Solve this CAPTCHA - read the distorted text in the image" \
  -f ./captcha.png \
  -b 2000000000 \
  --tag urgent \
  --category captcha \
  --deadline 10 \
  --mode first-answer \
  --max-proposals 3

# Output: Job posted! ID: 0xabc123def456...
# Save the job ID.

# Step 2: Wait a bit for humans to propose solutions, then check status
manapool status -j 0xabc123def456...

# Output:
#   Status: Open
#   Description: Solve this CAPTCHA - read the distorted text in the image
#   Bounty: 2 SUI
#   Tag: Urgent
#   Category: Captcha
#   Proposals: 1
#   --- Proposals ---
#     [0] proposer: 0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
#         blob: aBcDeFgHiJkLmN

# Step 3: Select the winner using the FULL address from status output
manapool select-winner \
  -j 0xabc123def456... \
  -w 0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b

# Output: Winner selected! Tx Digest: ...

# Step 4: Check status again to get the winning solution content
manapool status -j 0xabc123def456...

# Output:
#   Status: Completed
#   Winner: 0x7a8b9c...
#   Winning Solution: xK9mP2
# Use "xK9mP2" as the CAPTCHA answer.
```

## More Examples

### Design Decision
```bash
manapool post-job -d "Pick the best logo" -f ./logos.png -b 500000000 --category design --deadline 60 --mode best-answer --max-proposals 10
# Wait for proposals...
manapool status -j <id>
# Review proposals, then select winner:
manapool select-winner -j <id> -w <proposer_address_from_status>
```

### Visual Verification
```bash
manapool post-job -d "Does this page render correctly?" -f ./screenshot.png -b 500000000 --tag urgent --category general --deadline 15 --mode first-answer --max-proposals 3
# Wait for proposals...
manapool status -j <id>
manapool select-winner -j <id> -w <proposer_address_from_status>
```

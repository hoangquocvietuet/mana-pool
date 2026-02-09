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
# 1. Post the job with --urgent flag and a file (screenshot, image, etc.)
manapool post-job \
  --description "Solve this CAPTCHA so I can proceed" \
  --file ./captcha-screenshot.png \
  --bounty 2000000000 \
  --urgent

# Output: Job posted! ID: 0xabc123...

# 2. Poll and wait for the solution (blocks until solved or timeout)
manapool poll --job-id 0xabc123 --timeout 300

# Output: Solution received: "xK9mP2"
```

### Async Flow (Non-Blocking - Check Back Later)

When you can continue working while waiting:

```bash
# 1. Post the job
manapool post-job \
  --description "Which color scheme looks better for the landing page?" \
  --text "Option A: Navy + Gold, Option B: Forest Green + Cream, Option C: Charcoal + Coral" \
  --bounty 500000000

# Output: Job posted! ID: 0xdef456...

# 2. Save the job ID, continue with other work...

# 3. Check status later (non-blocking)
manapool status --job-id 0xdef456

# Output: Status: Completed | Solution: "Option B - Forest Green + Cream feels more welcoming"
```

### CLI Reference

```bash
# Post with a file attachment (uploaded to Walrus)
manapool post-job --description "..." --file ./path/to/file --bounty <MIST> [--urgent]

# Post with inline text
manapool post-job --description "..." --text "..." --bounty <MIST> [--urgent]

# Poll for solution (blocking, waits until complete)
manapool poll --job-id <ID> [--timeout <seconds>]

# Check status (non-blocking, returns immediately)
manapool status --job-id <ID>
```

### Bounty Amounts

- Bounty is in MIST (1 SUI = 1,000,000,000 MIST)
- Suggested: 0.5 SUI (500000000) for simple tasks, 2 SUI (2000000000) for urgent/complex

## Example Scenarios

### Scenario: CAPTCHA Block
```
You're automating a web scraping task and hit a CAPTCHA.
1. Take a screenshot of the CAPTCHA
2. Post to ManaPool: manapool post-job --description "Solve this CAPTCHA" --file ./captcha.png --bounty 2000000000 --urgent
3. Poll: manapool poll --job-id <id> --timeout 300
4. Use the solution text to submit the CAPTCHA form
```

### Scenario: Design Decision
```
You've generated 3 logo variants and need human preference.
1. Save the options to a file
2. Post: manapool post-job --description "Pick the best logo" --file ./logos.png --bounty 500000000
3. Continue other work
4. Check later: manapool status --job-id <id>
```

### Scenario: Visual Verification
```
You need to verify a deployment looks correct.
1. Screenshot the deployed page
2. Post: manapool post-job --description "Does this page render correctly? Check for layout issues" --file ./screenshot.png --bounty 500000000
3. Poll: manapool poll --job-id <id> --timeout 120
```

# iOS Shortcut: Save to date-idea bank

Blueprint §7.2. Lets Phương save a TikTok / IG URL from the iOS share sheet
straight into `date_ideas`.

## One-time setup (on her phone, in-person)

1. Generate a long random token (≥ 32 chars). E.g. `openssl rand -hex 32`.
2. Add it to Vercel env vars on **both** the staging and production projects:
   - Key: `SHORTCUT_TOKEN_HEO`
   - Value: the token from step 1
   - Environments: All (Production, Preview, Development) — but values differ
     between staging and prod, so generate two different tokens.
3. Build the Shortcut on her phone (Shortcuts app → +):
   - **Action 1: Receive** — set "Any" or "URLs" + "Text"
   - **Action 2: Ask for Input** — Question: "Notes?" (Allow Decimal Number = off,
     Default Answer empty) — marks the input as `Provided Input`. *Or skip this
     action if she doesn't want a prompt.*
   - **Action 3: Get Contents of URL**
     - URL: `https://heo-masuri-staging.vercel.app/api/dates/ideas/shortcut?token=<PASTE_TOKEN>`
       (or the prod URL once we go live)
     - Method: POST
     - Request Body: JSON
       - `url`: the share-sheet input (Shortcut Input)
       - `notes`: the Ask-for-Input result (optional)
   - **Action 4: Show Notification** — "Saved! 💕"
4. Tap the share sheet on any TikTok / IG / article → pick the Shortcut → Phương
   sees a "Saved!" toast and the row lands in the bank.

## Security

- Token leakage = unrestricted *insert* on `date_ideas` (no other tables, no read
  access).
- Don't paste the token in chat / commits / logs.
- Rotate: change the env var and rebuild the Shortcut URL on her phone.
- The endpoint always inserts with `added_by = Heo's user_id` — Masuri cannot
  use this Shortcut even with the token (route always credits Heo).

## Testing locally

```bash
curl -X POST "https://heo-masuri-staging.vercel.app/api/dates/ideas/shortcut?token=$SHORTCUT_TOKEN_HEO" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.tiktok.com/@example/video/123","notes":"cute date idea"}'
```

Expected: `{ "ok": true, "id": "<uuid>" }`.

If the token is missing on the server: `503 shortcut endpoint not configured`.
If the token mismatches: `401 Unauthorized`.

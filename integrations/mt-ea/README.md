# Genesis MT4 / MT5 Auto-Sync

Stream every trade you place in MetaTrader straight into your Genesis
analytics dashboard — no more CSV exports, no more "did this trade
import correctly?" Works with **any broker** that supports MT4 / MT5
(HFM, JustMarkets, XM, Exness, IC Markets, Capital Markets, etc.) and
captures trades placed from any device (phone, tablet, second laptop)
as long as **one** MetaTrader terminal somewhere has the EA running.

---

## Table of contents

1. [How it works](#how-it-works)
2. [Quick install (your own PC)](#quick-install)
3. [Always-on capture via Oracle Cloud Free VPS](#oracle-cloud-vps)
4. [EA inputs & files](#ea-inputs)
5. [Troubleshooting](#troubleshooting)

---

## How it works

```
  Phone trade ─┐
  Web trade   ─┼─▶ Broker server ─▶ MT4 / MT5 terminal ─▶ Genesis EA
  PC trade    ─┘                                              │
                                                              ▼
                                            POST https://<ref>.supabase.co
                                                /functions/v1/receive-trade
                                                                │
                                                                ▼
                                                Supabase `trades` table
                                                                │
                                                                ▼
                                       Genesis dashboard / reports / streaks
```

Because every device that trades the same MT account causes the broker
to push that order into every connected terminal, you only need **one**
terminal somewhere with the EA. The EA reports `AccountNumber()`,
broker, server, platform and `ticket` with every event so the Edge
Function can dedupe upserts on `(user_id, account_number, ticket)`.

The same compiled `.ex4 / .ex5` works for **any user, any broker, any
account** — the Genesis API key you paste into the EA inputs identifies
which user to attribute the trade to.

---

## Quick install (your own PC)

### 1. Generate a Genesis API key

Open the live app → **Settings → Accounts → Automatically Synced
Accounts → Generate API key**. The plaintext key is shown once
(`gs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`). Copy it.

### 2. Whitelist the Supabase URL in MetaTrader

Open MetaTrader (4 or 5):

> **Tools → Options → Expert Advisors**
> ✓ Allow algorithmic trading
> ✓ Allow WebRequest for listed URL
> Add the URL **exactly** as shown in Genesis — for example
> `https://genesis08.supabase.co`

If MetaTrader complains, paste the URL with NO trailing slash and click
OK. The EA needs this entry — without it `WebRequest` returns `-1`.

### 3. Drop the EA on a chart

- For MT4: copy [`mq4/GenesisSync.mq4`](./mq4/GenesisSync.mq4) into your
  terminal's `MQL4/Experts/` folder. In MetaEditor → Compile.
- For MT5: copy [`mq5/GenesisSync.mq5`](./mq5/GenesisSync.mq5) into your
  terminal's `MQL5/Experts/` folder. Compile.

In the terminal Navigator panel → expand "Expert Advisors" → drag
`GenesisSync` onto any chart of any symbol. The chart symbol is
irrelevant — the EA reads every open and historical trade on the
account.

In the EA dialog:

| Input | Value |
|------|------|
| `SupabaseUrl` | `https://YOUR-REF.supabase.co` (same as step 2) |
| `GenesisApiKey` | The `gs_…` key from step 1 |
| `AccountLabel` | (Optional) friendly label, e.g. `HFM Live USD` |
| `PollSeconds` | `30` (default) — how often to re-scan when idle |
| `HistoryDays` | `30` (default) — backfill window on EA start |

OK out. The smiley face top-right of the chart should turn into a
green smile. Place a test trade or check Reports — it should appear
within a couple of seconds.

### 4. Verify

- Genesis app → **Trades** → the new account should appear in the
  top-bar Accounts picker.
- Settings → Accounts → Automatically Synced Accounts → the EA-synced
  account is listed with last-synced-at timestamp.
- Place a small market order, take it off, and watch it land in
  Reports / Calendar / Streaks within a few seconds.

---

## Always-on capture via Oracle Cloud Free VPS

Your PC won't always be on, and you want trades placed from your phone
captured even at 3am. Solution: a free Oracle Cloud Always-Free Windows
VM running MetaTrader + the EA 24/7.

### Provision the VM (one-time)

1. Sign up at <https://cloud.oracle.com/free> — Always-Free includes 2
   AMD Compute VMs **and** up to 4 ARM-based VMs at no cost.
2. Console → **Compute → Instances → Create instance**.
3. Image: **Windows Server 2022 Standard**. Shape:
   `VM.Standard.E2.1.Micro` (AMD, Always-Free) is the simplest. Or
   `VM.Standard.A1.Flex` (ARM, 4 OCPU / 24 GB RAM Always-Free) for
   more headroom — Windows runs on ARM64 fine, MetaTrader runs in x64
   emulation.
4. Networking: Use the default VCN or create one. Allow inbound RDP
   (TCP 3389) **only from your IP** for security.
5. Set the Windows administrator password under "Initial credentials".
6. Create. Wait 2–3 minutes for the boot.

### RDP in & install MetaTrader

1. Note the VM's public IP from the OCI console.
2. From your machine: `mstsc` → connect to `<public-ip>` → log in as
   `opc` / `Administrator` with the password you set.
3. Inside the VM:
   - Disable IE Enhanced Security Configuration (Server Manager →
     Local Server → IE Enhanced Security Configuration → Off for
     Administrators).
   - Open Edge → download MetaTrader 4 / 5 from your broker (HFM,
     JustMarkets, etc.). Install.
   - Log into your trading account inside MetaTrader.
4. Drop the Genesis EA onto a chart following the **Quick install**
   section above. Whitelist your Supabase URL in
   `Tools → Options → Expert Advisors → Allow WebRequest`.

### Keep the terminal running

The VM is on 24/7, but Windows logs out RDP sessions when you
disconnect. To keep the terminal running:

- Use **disconnect** (not sign out) in mstsc — the session stays alive.
- Or set MetaTrader to auto-start on Windows startup
  (`shell:startup` → drop a shortcut) and enable auto-login for the
  Administrator account so reboots resume the EA without intervention.

That's it — phone trades, web-trader trades, additional terminal
trades all come back through the broker into this terminal, get
captured by the EA, and land in Genesis.

---

## EA inputs

| Field | Default | Notes |
|------|---------|------|
| `SupabaseUrl` | `https://YOUR-PROJECT-REF.supabase.co` | Your project URL — must be whitelisted in MT terminal options. |
| `GenesisApiKey` | `gs_xxxxxxxx…` | Generated in Genesis → Settings → Accounts. Stored hashed; revoke any time from Settings. |
| `AccountLabel` | empty | Optional friendly name — defaults to `AccountName()`. Shown in the Genesis Accounts picker. |
| `PollSeconds` | `30` | How often the EA re-scans open positions + history when no `OnTrade()` event has fired. |
| `HistoryDays` | `30` | Window of historical closed trades to backfill on EA start. Lower if your terminal has years of history and you don't want to spam the API. |

### Local files

- `MQL4/Files/Common/Genesis/seen_<account>.csv` (MT4) or `MQL5/...` (MT5)
  stores fingerprints of trades already reported so restarts don't
  duplicate. Safe to delete — the EA will re-scan and the Edge
  Function dedupes on `(user_id, account_number, ticket)` anyway.

---

## Troubleshooting

| Symptom | Cause / Fix |
|--------|-------------|
| EA logs `WebRequest failed err=4060` | Supabase URL not whitelisted in `Tools → Options → Expert Advisors`. Add it (no trailing slash). |
| EA logs `HTTP 401 Invalid or revoked API key` | The `gs_…` key was revoked, expired or mistyped. Generate a fresh one in Genesis Settings. |
| Trades show in MT history but not in Genesis | Open the MT **Experts** tab — the EA prints its activity there. Check for `HTTP` errors. The most common cause is whitelist not applied (re-open MT after whitelisting). |
| Account doesn't appear in Genesis Accounts picker | The Edge Function only auto-creates the `trade_files` row on the **first** trade the EA sends. Place / close a trade and refresh — the picker updates instantly. |
| Need multiple accounts | Generate **one** API key per Genesis user. Run the EA on multiple charts (each on a different MT account) — the same key works because the EA reports `AccountNumber()` with each event and Genesis groups by it. |

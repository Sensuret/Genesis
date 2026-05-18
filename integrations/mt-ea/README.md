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

> **Also check the toolbar:** the **Algo Trading** button at the top of
> the terminal must be **green** (not red). This is separate from the
> Options checkbox above — some MT5 updates silently flip this OFF
> after a restart, and the EA cannot run `WebRequest` while it's off.
> A red Algo Trading button is the single most common cause of "my EA
> stopped syncing after I rebooted my PC."

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

## Reconnection (what happens when MT4 / MT5 is closed and reopened)

The EA is **stateless on the wire and durable on disk** — you can close
MetaTrader (or shut down your entire PC) for hours or days, then reopen
it and trades resume syncing automatically. The Genesis app keeps
everything that was already streamed; nothing is lost.

What happens step-by-step when MT reopens:

1. MetaTrader auto-restores the EA on the chart it was saved to.
2. `OnInit()` fires inside the EA. It reads the persisted last-contact
   timestamp from `MQL5/Files/Common/Genesis/last_contact_<login>.txt`
   (MT5) or the equivalent MQL4 path, and logs into the **Experts** tab:

   ```
   [Genesis] Reconnecting — last contact 47 minute(s) ago. Endpoint=…
   ```

3. A heartbeat is sent first so the Genesis app's setup wizard flips to
   **Connected** within seconds (not the next 30s poll).
4. The EA then does a **forced full-history backfill**, ignoring the
   `HistoryDays` cap. Any trade that closed while you were offline gets
   posted (the seen-cache and the `(user_id, account_number, ticket)`
   upsert on the Supabase side make duplicates a no-op).
5. Open positions are re-posted.
6. The Experts log prints:

   ```
   [Genesis] Reconnected — backfilled 12 closed trade(s), 3 open position(s).
   ```

7. Normal poll / OnTrade / OnTick loop resumes.

On the **first tick after reattach** the EA also sends a one-off
heartbeat so the Genesis status chip flips to Connected the moment a
price update arrives, instead of waiting up to `PollSeconds` (default
30s) for the next `OnTimer` tick.

### Transient network failures

If a `WebRequest` returns `-1` (timeout) or an HTTP 5xx (Supabase brief
outage), the EA retries **immediately once** after 500ms before logging
an error. If the retry also fails, it backs off exponentially —
30s → 60s → 120s → 240s → 300s (capped) — until the network recovers,
at which point the timer resumes posting normally. This prevents a
flaky Wi-Fi blip from dropping a single trade and prevents a sustained
outage from busy-looping on every tick.

---

## Troubleshooting

| Symptom | Cause / Fix |
|--------|-------------|
| EA logs `WebRequest failed err=4060` | Supabase URL not whitelisted in `Tools → Options → Expert Advisors`. Add it (no trailing slash). |
| EA logs `WebRequest failed err=…` but URL is whitelisted | The **Algo Trading** button on the toolbar is red. Click it once so it turns green. Some MT5 builds reset this on PC reboot. |
| EA logs `HTTP 401 Invalid or revoked API key` | The `gs_…` key was revoked, expired or mistyped. Generate a fresh one in Genesis Settings. |
| Trades show in MT history but not in Genesis | Open the MT **Experts** tab — the EA prints its activity there. Check for `HTTP` errors. The most common cause is whitelist not applied (re-open MT after whitelisting). |
| Account doesn't appear in Genesis Accounts picker | The Edge Function only auto-creates the `trade_files` row on the **first** trade the EA sends. Place / close a trade and refresh — the picker updates instantly. |
| Genesis wizard didn't flip to Connected after I reopened MT | Watch the **Experts** tab for `[Genesis] Reconnecting — last contact …` and `[Genesis] Reconnected — backfilled …`. If neither appears, the EA isn't loaded — check the chart for the EA icon (top-right) and the smiley face (top-right of chart). |
| Need multiple accounts | Generate **one** API key per Genesis user. Run the EA on multiple charts (each on a different MT account) — the same key works because the EA reports `AccountNumber()` with each event and Genesis groups by it. |

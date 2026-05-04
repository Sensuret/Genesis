# Oracle Cloud VPS Setup — Always-Free Windows Server for MT4/MT5

This guide walks you through setting up a **free** Oracle Cloud Windows Server VM
that runs MetaTrader 24/7, capturing trades placed from your phone or any device.

## Why a VPS?

MetaTrader's Expert Advisor (EA) must run on a **live terminal** to detect trades.
If you close your PC or lose internet, the EA can't sync. A VPS keeps the terminal
running 24/7. Oracle Cloud's Always Free tier gives you a Windows Server VM at
**zero cost** — no credit card charges after the trial.

## Step 1 — Create an Oracle Cloud Account

1. Go to <https://cloud.oracle.com/> and click **Start for Free**.
2. Complete the signup (a credit card is required for verification but you won't
   be charged on the Always Free tier).
3. Choose a **Home Region** close to your broker's server (e.g. London, Frankfurt).

## Step 2 — Create a Windows VM

1. In the Oracle Cloud Console, go to **Compute → Instances → Create Instance**.
2. Configure:
   - **Name**: `genesis-mt-vps`
   - **Image**: Click "Change image" → select **Windows Server 2022 Standard**
   - **Shape**: `VM.Standard.A1.Flex` (Always Free eligible)
     - OCPUs: **1**
     - Memory: **6 GB** (enough for MT4 + MT5 side by side)
   - **Networking**: Use the default VCN or create one. Ensure port **3389 (RDP)**
     is open in the security list.
3. Click **Create**. Wait ~5 minutes for provisioning.
4. Note the **Public IP** and **Initial Password** from the instance details.

## Step 3 — Connect via Remote Desktop

- **Windows**: Open Remote Desktop Connection, enter the Public IP.
- **macOS**: Install "Microsoft Remote Desktop" from the App Store.
- **Linux**: Use `rdesktop` or `xfreerdp`.
- Login with `opc` (username) and the initial password.

## Step 4 — Install MetaTrader

1. Open Internet Explorer / Edge on the VPS.
2. Download MT4 from your broker (e.g. HFM, JustMarkets):
   - HFM MT4: <https://www.hfm.com/en/trading-platforms/mt4>
   - JustMarkets MT4: <https://justmarkets.com/trading-platforms/metatrader-4>
3. Install and log in to your trading account.
4. Repeat for MT5 if needed.

## Step 5 — Install the Genesis EA

1. Copy `Genesis_TradeSync_MT4.mq4` to `C:\Users\opc\AppData\Roaming\MetaQuotes\Terminal\<HASH>\MQL4\Experts\`
2. In MetaTrader:
   - Go to **Tools → Options → Expert Advisors**
   - Check ✓ **Allow automated trading**
   - Check ✓ **Allow DLL imports** (optional, not needed for our EA)
   - Check ✓ **Allow WebRequest for listed URL**
   - Add your Supabase endpoint URL:
     `https://<PROJECT_REF>.supabase.co/functions/v1/receive-trade`
3. In the **Navigator** panel, find **Genesis_TradeSync_MT4** under Expert Advisors.
4. Drag it onto any chart (e.g. EURUSD M1).
5. In the EA inputs dialog:
   - Set **GenesisEndpoint** to your Supabase Edge Function URL
   - Set **ApiKey** to your Genesis API key
6. Click OK. The EA is now running.

For MT5, repeat with `Genesis_TradeSync_MT5.mq5` in the `MQL5\Experts\` folder.

## Step 6 — Keep It Running 24/7

- **Do not close** the Remote Desktop session by clicking the X button — this
  keeps the session alive. Instead, just disconnect (close the RDP window).
- The VPS continues running even when you're not connected.
- MetaTrader and the EA remain active.

### Prevent Windows from sleeping

Open PowerShell as Administrator and run:

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
```

### Auto-start MetaTrader on reboot

1. Press `Win+R`, type `shell:startup`, press Enter.
2. Create a shortcut to `terminal.exe` (MT4) or `terminal64.exe` (MT5) in this folder.
3. The terminal will auto-launch if the VPS ever reboots.

## How It Captures Phone Trades

When you place a trade from your phone (or any device), the order goes to the
**broker's server**. Your VPS-hosted MetaTrader terminal is logged into the same
account, so it **sees the trade appear** in real time. The Genesis EA detects the
new trade and syncs it to Supabase within seconds.

```
Phone → Broker Server → MT4/MT5 on VPS (EA detects trade) → Supabase → Genesis Dashboard
```

This works for:
- Trades placed from mobile apps
- Trades placed from another desktop
- Trades opened by other EAs
- Copy-trading / signal services

## Costs

| Resource | Cost |
|----------|------|
| Oracle VM.Standard.A1.Flex (1 OCPU, 6 GB RAM) | **Free** (Always Free tier) |
| Supabase (Free tier) | **Free** (500 MB database, 500K Edge Function invocations/month) |
| MetaTrader | **Free** (provided by your broker) |
| Genesis EA | **Free** (included in this repo) |

**Total: $0/month**

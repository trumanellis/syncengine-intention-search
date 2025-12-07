# Relay Node Setup Guide

## Quick Start (Local Testing)

### Step 1: Start Relay Node

```bash
cd relay-node
npm install
npm start
```

The relay will print its connection information:

```
📋 Connection Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Peer ID: 12D3KooWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

🌐 Listen Addresses:
  /ip4/127.0.0.1/tcp/9090/ws/p2p/12D3KooWXXXXXXXXXXXXXXXX...
  👆 Use this address in browser app (WebSocket)
```

**Copy the WebSocket address** (the one with `/ws/` in it).

### Step 2: Update Browser App

Open `src/lib/libp2p.js` and find the bootstrap configuration (around line 85).

Uncomment and update the relay address:

```javascript
bootstrap: bootstrap({
  list: [
    // Paste YOUR relay address here:
    '/ip4/127.0.0.1/tcp/9090/ws/p2p/12D3KooWXXXXXXXXXXXXXXXX...',
  ],
  timeout: 5000,
}),
```

### Step 3: Restart Dev Server

```bash
# In project root
npm run dev
```

### Step 4: Test in Browser

1. Open `http://localhost:5173` in **Chrome**
2. Authenticate
3. Open Network Diagnostics (top right)
4. Watch for:
   - **Relay indicator**: Should turn green
   - **Addresses**: Should show 2-4 multiaddrs
   - **Mode**: Should change to "Ready"
5. Click "Share" to see magic link with peer addresses

### Step 5: Test Peer Connection

1. Open magic link in **Brave** (different browser)
2. Should connect within 5-15 seconds
3. Both browsers should show:
   - P2P Peers: 1
   - Status: Connected

## Expected Output

### Relay Node Console:
```
🤝 Peer connected: 12D3KooWABCDEF...
🔗 Circuit relay reservation made by: 12D3KooWABCDEF...
🤝 Peer connected: 12D3KooWGHIJKL...
🔗 Circuit relay reservation made by: 12D3KooWGHIJKL...
```

### Browser Console (Chrome):
```
🌐 Browser P2P Mode: WebSocket Relay + WebRTC
📡 Connection strategy:
   1. Connect to relay node via WebSocket (bootstrap)
   2. Get circuit relay reservation → generate multiaddrs
   3. Share multiaddrs via magic links for direct WebRTC
   4. Discover additional peers via pubsub
⚠️  Relay node required - see relay-node/README.md
🤝 Peer connected: 12D3KooW... (relay node)
```

### Network Diagnostics Panel:
```
P2P Peers: 0 → 1 (when other browser connects)
Mode: Starting... → Ready → Connected
Relay: None → Active
Addresses: 0 → 2-4
```

## Troubleshooting

### "No multiaddrs available"

**Problem**: Browser can't connect to relay node.

**Solutions**:
1. Check relay node is running: `relay-node/` terminal should show "✅ Relay node started"
2. Verify you copied the correct WebSocket address (with `/ws/`)
3. Check bootstrap list in `src/lib/libp2p.js` is uncommented
4. Restart dev server after changing libp2p.js

### Relay node shows "EADDRINUSE"

**Problem**: Port 9090 is already in use.

**Solution**:
```bash
# Use a different port
WS_PORT=8080 npm start

# Then update browser app with new port:
'/ip4/127.0.0.1/tcp/8080/ws/p2p/...'
```

### Browser shows "Connection timeout"

**Problem**: Can't reach relay node.

**Solutions**:
1. Check relay is running
2. Check firewall allows port 9090
3. Try localhost instead of 127.0.0.1
4. Check browser console for errors

## Production Deployment

For production deployment to your Namecheap server, see:

📖 **[relay-node/README.md](relay-node/README.md)**

Includes:
- SSH deployment instructions
- PM2/systemd setup for auto-restart
- SSL/TLS configuration (wss://)
- Firewall configuration
- Domain name setup
- Monitoring and troubleshooting

## Next Steps

Once your relay is working locally:

1. ✅ Test magic link connections between browsers
2. ✅ Verify peer discovery works
3. ✅ Test intention creation and sync
4. 🚀 Deploy relay to Namecheap server
5. 🌐 Update browser app with production relay address
6. 🎉 Deploy browser app to GitHub Pages

## Architecture Diagram

```
┌─────────────┐     WebSocket      ┌──────────────┐
│  Browser A  │◄──────(wss://)─────►│  Relay Node  │
│  (Chrome)   │                     │  (Server)    │
└─────────────┘                     └──────────────┘
       ▲                                    ▲
       │                                    │
       │  WebRTC (direct)             WebSocket
       │  after relay intro           (wss://)
       │                                    │
       ▼                                    ▼
┌─────────────┐                     ┌─────────────┐
│  Browser B  │                     │  Browser C  │
│  (Brave)    │◄───WebRTC direct───►│  (Firefox)  │
└─────────────┘                     └─────────────┘
```

**Flow:**
1. All browsers connect to relay via WebSocket
2. Relay provides circuit addresses
3. Browsers share addresses via magic links
4. Browsers establish direct WebRTC connections
5. Relay is only needed for initial discovery

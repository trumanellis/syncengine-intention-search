# SyncEngine Relay Node

WebSocket relay node for browser P2P connections using libp2p circuit relay v2.

## What It Does

This relay node acts as a bridge between browsers that cannot directly connect to each other due to NAT/firewalls. Browsers connect to the relay via WebSocket, get a circuit relay reservation, and can then be discovered by other peers.

## Architecture

```
Browser A → WebSocket → Relay Node → WebSocket → Browser B
           (wss://)                    (wss://)
```

## Quick Start

### 1. Install Dependencies

```bash
cd relay-node
npm install
```

### 2. Run Locally

```bash
npm start
```

The relay will start on:
- WebSocket: `localhost:9090` (for browsers)
- TCP: `localhost:9091` (for Node.js peers)

### 3. Get the Connection Address

When the relay starts, it will print:

```
📋 Connection Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Peer ID: 12D3KooWXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

🌐 Listen Addresses:
  /ip4/0.0.0.0/tcp/9090/ws/p2p/12D3KooWXXXXXXXXXXXXXXXXXXXX...
  👆 Use this address in browser app (WebSocket)
```

**Copy the WebSocket address** - you'll need it for the browser app.

## Deploy to Namecheap Server

### Prerequisites

- SSH access to your server
- Node.js 18+ installed on server
- Open port 9090 (or your chosen port) in firewall

### Step 1: SSH into Server

```bash
ssh your-user@your-server-ip
```

### Step 2: Install Node.js (if not installed)

```bash
# Check if Node.js is installed
node --version

# If not installed (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be 18.0.0 or higher
npm --version
```

### Step 3: Upload Relay Node Code

Option A: Using Git (recommended)
```bash
cd ~
git clone https://github.com/your-username/syncengine-intention-search.git
cd syncengine-intention-search/relay-node
npm install
```

Option B: Using SCP from local machine
```bash
# From your local machine:
scp -r relay-node your-user@your-server-ip:~/
```

### Step 4: Configure Firewall

```bash
# Allow WebSocket port (9090)
sudo ufw allow 9090/tcp

# Check firewall status
sudo ufw status
```

### Step 5: Run Relay Node

**Option A: Run in foreground (for testing)**
```bash
cd ~/relay-node  # or ~/syncengine-intention-search/relay-node
npm start
```

**Option B: Run with PM2 (recommended for production)**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start relay with PM2
pm2 start server.js --name syncengine-relay

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup

# View logs
pm2 logs syncengine-relay

# Restart relay
pm2 restart syncengine-relay

# Stop relay
pm2 stop syncengine-relay
```

**Option C: Run with systemd**
```bash
# Create systemd service file
sudo nano /etc/systemd/system/syncengine-relay.service
```

Add:
```ini
[Unit]
Description=SyncEngine libp2p Relay Node
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user/relay-node
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production
Environment=WS_PORT=9090

[Install]
WantedBy=multi-user.target
```

Then:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable syncengine-relay

# Start service
sudo systemctl start syncengine-relay

# Check status
sudo systemctl status syncengine-relay

# View logs
sudo journalctl -u syncengine-relay -f
```

### Step 6: Get Server's Public IP or Domain

```bash
# Get public IP
curl ifconfig.me

# Or if you have a domain:
# relay.yourdomain.com
```

### Step 7: Test Connection

From your local machine:
```bash
# Test if WebSocket port is open
telnet your-server-ip 9090

# Or use netcat
nc -zv your-server-ip 9090
```

### Step 8: Update Browser App

Copy the multiaddr from relay logs (replace IP with your server's IP or domain):

```
/ip4/YOUR_SERVER_IP/tcp/9090/ws/p2p/12D3KooWXXXXXXXXXXXXXXXX...
```

Or if using a domain:
```
/dns4/relay.yourdomain.com/tcp/9090/ws/p2p/12D3KooWXXXXXXXXXXXXXXXX...
```

## Configuration

### Environment Variables

- `WS_PORT` - WebSocket port (default: 9090)
- `TCP_PORT` - TCP port for Node.js peers (default: 9091)
- `HOST` - Bind address (default: 0.0.0.0)

Example:
```bash
WS_PORT=8080 HOST=0.0.0.0 npm start
```

### Custom Ports

If port 9090 is already in use:
```bash
WS_PORT=8080 npm start
```

## SSL/TLS Setup (wss://)

For production, use **wss://** (WebSocket Secure) instead of **ws://**.

### Option 1: Using Caddy (easiest)

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Create Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Add:
```
relay.yourdomain.com {
  reverse_proxy /tcp/9090/ws/* localhost:9090
}
```

```bash
# Restart Caddy
sudo systemctl restart caddy
```

Now your relay is available at: `wss://relay.yourdomain.com/tcp/9090/ws`

### Option 2: Using Nginx

```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d relay.yourdomain.com

# Configure Nginx
sudo nano /etc/nginx/sites-available/relay
```

Add:
```nginx
server {
    listen 443 ssl http2;
    server_name relay.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/relay.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.yourdomain.com/privkey.pem;

    location /tcp/9090/ws/ {
        proxy_pass http://localhost:9090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/relay /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## Monitoring

### Check if relay is running

```bash
# With PM2
pm2 status

# With systemd
sudo systemctl status syncengine-relay

# Check listening ports
sudo netstat -tulpn | grep 9090
```

### View logs

```bash
# With PM2
pm2 logs syncengine-relay --lines 100

# With systemd
sudo journalctl -u syncengine-relay -f

# Or if running with npm start
# Logs are in terminal
```

### Test relay from browser

Open browser console on your app and check:
```
🤝 Peer connected: [peer ID]
✅ Connected to relay node
```

## Troubleshooting

### Port already in use
```bash
# Find process using port
sudo lsof -i :9090

# Kill process if needed
sudo kill -9 <PID>
```

### Cannot connect from browser

1. Check firewall allows port 9090
   ```bash
   sudo ufw status
   ```

2. Test port is open
   ```bash
   telnet your-server-ip 9090
   ```

3. Check relay is running
   ```bash
   pm2 status  # or systemctl status syncengine-relay
   ```

4. Check logs for errors
   ```bash
   pm2 logs syncengine-relay  # or journalctl -u syncengine-relay
   ```

### Browser shows "Failed to connect to relay"

1. Verify multiaddr is correct in browser app
2. Check server public IP is correct
3. Ensure WebSocket port (9090) is open in firewall
4. Try using domain name instead of IP address
5. Check SSL if using wss://

## Security Considerations

- **Firewall**: Only open necessary ports (9090 for WebSocket)
- **SSL**: Use wss:// (WebSocket Secure) in production
- **Rate Limiting**: Consider adding rate limits for connections
- **Monitoring**: Monitor for unusual traffic patterns
- **Updates**: Keep Node.js and dependencies updated

## Upgrading

```bash
cd relay-node
git pull  # if using git
npm install
pm2 restart syncengine-relay  # if using PM2
# or
sudo systemctl restart syncengine-relay  # if using systemd
```

## Support

For issues or questions:
- Check logs first
- Verify firewall/network configuration
- Test connection with telnet or netcat
- Check relay node is running

# Production Deployment & Custom Domain Setup Guide

Yes! You can completely deploy your **Smart Health Ecosystem** website with your own custom domain name (such as `healthportal.yourhospital.org`, `care.yourdomain.com`, or `yourhospital.com`).

This platform is a full-stack web application built with **React (Vite) + Node.js (Express)**. In production mode (`NODE_ENV=production`), Express directly serves the compiled static production bundle from `/dist` and powers all real-time REST APIs and server storage from a single unified server on port `3000`.

---

## 🚀 Quick Step-by-Step Overview

```
┌──────────────────────────┐      ┌──────────────────────────────┐      ┌────────────────────────┐
│ 1. Domain Registrar      │ ───► │ 2. DNS Zone Management       │ ───► │ 3. Production Server   │
│ (GoDaddy, Namecheap,     │      │ Add A or CNAME Records       │      │ Cloud Run, VPS, Docker │
│ Cloudflare, Route 53)    │      │ Points to Server IP / Target │      │ Runs on Port 3000      │
└──────────────────────────┘      └──────────────────────────────┘      └────────────────────────┘
                                                                                    │
                                                                                    ▼
                                                                        ┌────────────────────────┐
                                                                        │ 4. Automatic SSL / TLS │
                                                                        │ Free 2048-bit HTTPS    │
                                                                        │ Let's Encrypt / Google │
                                                                        └────────────────────────┘
```

---

## 1. Domain Name & DNS Record Configuration

Log in to the DNS management panel at your domain provider (GoDaddy, Namecheap, Cloudflare, Hostinger, AWS Route 53, or Google Domains/Squarespace).

### Scenario A: Deploying on a Subdomain (Recommended)
*Example: `care.myhospital.org` or `app.myhospital.com`*

| Record Type | Name / Host | Target / Points To | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `care` (or `app`) | `ghs.googlehosted.com` *(for Cloud Run)* or your VPS public domain | `3600` (1 Hour) | Routes traffic to your application |
| **TXT** | `@` or `care` | `smarthealth-verify-domain=care.myhospital.org` | `300` | Domain ownership validation |

### Scenario B: Deploying on the Root / Apex Domain
*Example: `myhospital.org` or `myhospital.com`*

| Record Type | Name / Host | Target / Points To (IPv4) | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `216.239.32.21` *(or your VPS static IP)* | `3600` | Primary IPv4 routing |
| **A** | `@` | `216.239.34.21` *(or your VPS secondary IP)* | `3600` | Redundant IPv4 routing |
| **CNAME** | `www` | `myhospital.org` | `3600` | Redirects `www` to root |

> ⏱ **DNS Propagation**: DNS updates usually take between 5 to 15 minutes to propagate worldwide.

---

## 2. Recommended Hosting Options

### Option 1: Google Cloud Run (Easiest, Serverless & Auto-SSL)

Google Cloud Run automatically handles SSL certificates, autoscaling from 0 to thousands of users, and zero server maintenance.

#### Step 1: Build the production bundle
```bash
npm install
npm run build
```

#### Step 2: Deploy container to Cloud Run
```bash
gcloud run deploy smarthealth \
  --source . \
  --port 3000 \
  --allow-unauthenticated \
  --region asia-south1
```

#### Step 3: Map your custom domain
```bash
gcloud beta run domain-mappings create \
  --service smarthealth \
  --domain care.myhospital.org \
  --region asia-south1
```

Google Cloud automatically verifies the DNS mapping and provisions a free managed SSL/TLS certificate.

---

### Option 2: Linux Cloud VPS (Ubuntu 22.04 / 24.04 with Nginx & Let's Encrypt)

Works on any VPS provider (DigitalOcean, AWS EC2, Linode/Akamai, Hetzner, Hostinger VPS).

#### Step 1: Install Node.js, PM2, and Nginx
```bash
sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

#### Step 2: Clone repository & build application
```bash
git clone <your-repo-url> /var/www/smarthealth
cd /var/www/smarthealth
npm install
npm run build
```

#### Step 3: Start application as a background service via PM2
```bash
NODE_ENV=production PORT=3000 pm2 start server.ts --name "smarthealth" --interpreter ./node_modules/.bin/tsx
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/smarthealth`:
```nginx
server {
    server_name care.myhospital.org;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 25M;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/smarthealth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 5: Activate Free Automated SSL Certificate (Certbot)
```bash
sudo certbot --nginx -d care.myhospital.org
```
*Certbot configures HTTPS port 443 and auto-renews certificates every 90 days.*

---

### Option 3: Docker Container Deployment

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
```

Run container with volume persistence for hospital records and uploaded licenses:
```bash
docker build -t smarthealth-app .
docker run -d \
  --name smarthealth-app \
  -p 80:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  --restart always \
  smarthealth-app
```

---

## 3. Data Persistence & Backups

The platform stores persistent ecosystem records in:
1. `data/server_storage.json`: All registered hospitals, doctors, patient appointments, prescription records, and emergency telemetry.
2. `uploads/`: Uploaded statutory licenses, NABH documents, doctor degree certificates, and official logos.
3. *Optional*: Live Firestore synchronization (`firebase-applet-config.json`) if enabled.

**Backup command:**
```bash
tar -czvf smarthealth_backup_$(date +%F).tar.gz data/ uploads/
```

---

## 4. Environment Variables Checklist

Set these environment variables on your production server:

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables compiled Vite bundle serving and disables development HMR |
| `PORT` | `3000` | Application server port |
| `SMTP_HOST` | *(Optional e.g. smtp.gmail.com)* | Host for automated credential emails |
| `SMTP_PORT` | `587` | Secure TLS port |
| `SMTP_USER` | `admin@myhospital.org` | Email address dispatching official verification notices |
| `SMTP_PASS` | `<app-password>` | App password for automated email delivery |
| `GEMINI_API_KEY` | `<your-api-key>` | Optional: Powers AI health symptom analyzer and diagnostics |

---

## 5. Verification Checklist

- [ ] DNS A or CNAME record resolves to your server (`ping care.myhospital.org` or `nslookup care.myhospital.org`).
- [ ] Navigating to `https://care.myhospital.org` displays the green lock icon in the browser address bar.
- [ ] Patient appointment booking displays consultation fee breakdown (OPD and follow-up) in INR (₹).
- [ ] Admin Portal shows full hospital audit details with the 4-tabbed inspection modal.
- [ ] Database exports are operational under the Admin Live Database Manager.

# Live Production Deployment & Custom Domain Guide

Your **Smart Health Management & Accident Prevention Ecosystem** is production-ready and configured for immediate public use.

---

## Option 1: Share Your Instant Live Public URL (Fastest — Ready Right Now)

Your application is already hosted on Google Cloud Run through AI Studio:

- **Public Shared Website URL**:
  `https://ais-pre-agnngcgcncmh4v642hscyo-369323863521.asia-east1.run.app`

### How to make sure everyone can open it:
1. In the top-right corner of AI Studio, click the **Share** button.
2. Switch access to **Public (Anyone with the link)**.
3. Click the **"Deploy & Share Live"** button in the top navigation bar of your website to copy the public link, share directly to WhatsApp/Email, or download the **Reception QR Code** for patients and doctors to scan on their phones.

---

## Option 2: 1-Click Dedicated Google Cloud Run Deployment

To publish your own standalone production instance on Google Cloud Run:

1. Click the **Deploy (Rocket icon)** in the top-right toolbar of AI Studio.
2. Select your Google Cloud Project (`smart-health-management-6cc87`).
3. Once deployed, copy your new `.run.app` URL.
4. Open [Firebase Console](https://console.firebase.google.com/project/smart-health-management-6cc87/authentication/settings) &rarr; **Authentication** &rarr; **Settings** &rarr; **Authorized domains** &rarr; **Add domain**, and paste your deployed domain so Google Sign-In works for all users.

---

## Option 3: Connect Your Own Custom Domain (e.g., `smarthealth.org` or `care.yourhospital.in`)

1. Open [Google Cloud Run Custom Domains](https://console.cloud.google.com/run/domains) and click **Add Mapping**.
2. Select your deployed Cloud Run service and enter your domain name.
3. Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, or Hostinger) and add the DNS records:
   - **For a Subdomain (`care.yourhospital.in`)**:
     - **Type**: `CNAME`
     - **Host / Name**: `care`
     - **Target / Value**: `ghs.googlehosted.com.`
   - **For a Root / Apex Domain (`yourhospital.in`)**:
     - **Type**: `A` (`@`) &rarr; `216.239.32.21`, `216.239.34.21`, `216.239.36.21`, `216.239.38.21`
4. Google automatically provisions a free managed SSL/TLS (`https://`) certificate within 15–30 minutes.
5. Add your custom domain to **Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains**.

---

## Option 4: Self-Hosting on Render, Railway, AWS, or Ubuntu VPS

If you export the project ZIP to host on your own server:

```bash
# 1. Install dependencies
npm install

# 2. Build the production frontend into dist/
npm run build

# 3. Start the production Express + API + SPA server
NODE_ENV=production PORT=3000 npm start
```

### Required Production Environment Variables (`.env`):
```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
SMTP_USER=aivirtualcare@gmail.com
SMTP_PASS=your_gmail_app_password
VITE_FIREBASE_PROJECT_ID=smart-health-management-6cc87
```

# Cloudflare & Domain Cutover Checklist for `zyven.me`

## 1. Domain Cutover & DNS Cleanup (Namecheap → Cloudflare)

1. **Update Nameservers at Namecheap**:
   - Log into Namecheap Dashboard → Domain List → `zyven.me` → **Manage**.
   - Under **Nameservers**, select **Custom DNS** and enter the two Cloudflare nameservers provided by your Cloudflare zone.
2. **Remove GitHub Pages DNS Records**:
   - In Cloudflare DNS management, delete any imported legacy GitHub Pages `A` records:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - Delete any legacy `CNAME` records pointing to `*.github.io`.
3. **Remove Custom Domain from GitHub Pages**:
   - In the GitHub repository hosting the placeholder: **Settings** → **Pages**.
   - Under **Custom domain**, click **Remove** (and delete any `CNAME` file in the repository branch) to release domain ownership.

---

## 2. Cloudflare Tunnel Configuration (`cloudflared`)

1. **Create Cloudflare Tunnel**:
   - Cloudflare Zero Trust Dashboard → **Networks** → **Tunnels** → **Create a tunnel** (e.g., `zyven-prod-tunnel`).
   - Copy the generated `TUNNEL_TOKEN` and save it to `/zyven/prod/CLOUDFLARE_TUNNEL_TOKEN` in AWS Parameter Store.
2. **Public Hostname Routes**:
   - **Apex (`zyven.me`)**:
     - Subdomain: *(leave empty)*
     - Domain: `zyven.me`
     - Type: `HTTP`
     - URL: `app:3000` (resolves over internal Docker network `zyven-internal`)
3. **WWW Redirection Rule**:
   - In Cloudflare Dashboard → **Rules** → **Redirect Rules** → **Create rule**:
     - Rule name: `Redirect WWW to Apex`
     - Match: Custom filter expression `(http.host eq "www.zyven.me")`
     - Action: **Dynamic**
     - Expression: `concat("https://zyven.me", http.request.uri.path)`
     - Status code: `301 (Moved Permanently)`
     - Preserve query string: Checked

---

## 3. SSL/TLS & Security Controls

* [x] **SSL/TLS Encryption Mode**: Set to **Full (strict)** or **Full**.
* [x] **Edge Certificates**:
  * Enable **Always Use HTTPS** (HTTP → HTTPS redirection).
  * Enable **Automatic HTTPS Rewrites**.
  * Enable **HSTS** (Strict-Transport-Security): `max-age=31536000`, `includeSubDomains`, `preload`.
* [x] **Bot Fight Mode**: Enable in **Security** → **Bots**.
* [x] **WAF Rate Limiting Rules** (**Security** → **WAF** → **Rate limiting rules**):
  1. **Login Protection**:
     - URI Path: `/api/auth/login`
     - Threshold: `5 requests per 10 seconds` per IP
     - Action: `Block for 15 minutes`
  2. **Payment Order Creation Protection**:
     - URI Path: `/api/payment/razorpay/create-order`
     - Threshold: `10 requests per minute` per IP
     - Action: `Managed Challenge`

---

## 4. Razorpay Webhook Configuration

* **Webhook URL**: `https://zyven.me/api/payment/razorpay/webhook`
* **Secret**: The exact secret saved under `/zyven/prod/RAZORPAY_WEBHOOK_SECRET`.
* **Subscribed Events**:
  - `payment.captured`
  - `payment.failed`
  - `order.paid`
* **Security & Idempotency Safeguards**:
  - Raw-body signature verification: The endpoint uses `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` with timing-safe comparison (`crypto.timingSafeEqual`).
  - Atomic idempotency: If the order is already marked `PAID`, subsequent webhook notifications return HTTP 200 immediately without double-updating inventory or duplicating notifications.

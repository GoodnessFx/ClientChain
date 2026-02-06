# ClientChain Platform

A viral referral automation platform for med spas, featuring AI-driven booking, group events, corporate wellness, and comprehensive business operations management.

## 🚀 Features

### Core Modules
1.  **Post-Treatment Referral Capture**: AI friend suggestions, personalized video generation, delivery tracking.
2.  **Group Booking Engine**: Split payments, dynamic pricing, coordination tools.
3.  **Instagram Story Automation**: Story mention tracking, gamified leaderboards, automated rewards.
4.  **Event Hosting (Botox Parties)**: Event management, RSVP tracking, QR code check-in, host rewards.
5.  **Corporate Wellness**: B2B partnership management, employee engagement portals, recurring billing.

### Advanced Capabilities (Modules 6-10)
-   **Network Value Tracker**: Visual graph of client referral networks and viral coefficients.
-   **Automation Engine**: Custom workflow triggers (SMS/Email/Rewards) based on client actions.
-   **Payment & Commission**: Stripe Connect integration for split payments and automated commission payouts.
-   **Admin & Operations**: Multi-location support, RBAC, white-label branding, fraud detection, compliance settings.
-   **AI Chatbot & Booking**: Intelligent conversational agent for 24/7 booking and support.

### Enterprise Features
-   **Security**: Role-Based Access Control (RBAC), Audit Logging, HIPAA-compliant settings.
-   **Scalability**: Built on Supabase Edge Functions (Deno) and KV Store for high availability.
-   **Integrations Hub**: Pre-built connectors for Stripe, Twilio, SendGrid, Salesforce, HubSpot.
-   **Reliability**: Automated backup & disaster recovery endpoints.

## 🛠️ Tech Stack

-   **Frontend**: React, Vite, Tailwind CSS, Radix UI, Recharts, D3.js
-   **Backend**: Supabase Edge Functions (Deno), Hono framework
-   **Database**: Supabase KV Store (Redis-compatible) & Postgres (via Supabase)
-   **Payments**: Stripe Connect
-   **AI**: OpenAI / Pinecone (Mocked for demo)

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/clientchain/platform.git
    cd platform
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    STRIPE_SECRET_KEY=your_stripe_secret_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Access the web app at `http://localhost:5173`.

5.  **Deploy Backend**
    ```bash
    supabase functions deploy server
    ```

## 📚 API Documentation

The backend API is built with Hono and deployed as a Supabase Edge Function.

### Key Endpoints

-   **Referrals**: `POST /referrals`, `POST /referrals/video/generate`
-   **Groups**: `POST /groups`, `POST /bookings/group/split-payment`
-   **Events**: `GET /events`, `POST /events/:id/rsvp`
-   **Corporate**: `POST /corporate/partners`, `GET /corporate/analytics/engagement`
-   **Admin**: `GET /medspas/:id/staff`, `PUT /medspas/:id/branding`

*Full OpenAPI documentation available in `/docs/openapi.yaml` (placeholder).*

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

## 🔒 Security & Compliance

-   **RBAC**: Middleware ensures only authorized roles (owner, manager) access sensitive endpoints.
-   **Audit Logs**: Critical actions (payments, config changes) are logged for compliance.
-   **Data Privacy**: Designed with HIPAA compliance in mind (encryption at rest/transit).

## 📈 Monitoring

-   **Sentry**: Error tracking
-   **Datadog**: APM & Infrastructure monitoring
-   **LogRocket**: Session replay

---

© 2026 ClientChain. All rights reserved.

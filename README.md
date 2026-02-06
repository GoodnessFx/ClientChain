# ClientChain Platform

![Status](https://img.shields.io/badge/status-production--ready-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20Supabase%20%7C%20Stripe-purple)

**ClientChain** is the world's first viral referral automation platform designed specifically for Med Spas. It transforms passive clients into active promoters through AI-driven incentives, group booking dynamics, and corporate wellness partnerships.

## 🚀 Key Features

ClientChain is built on 10 core modules that drive growth and operational efficiency:

### Phase 1: Viral Growth Engines
1.  **Post-Treatment Referral Capture**:
    *   AI-powered "Friend Suggestions" based on client demographics.
    *   Instant personalized video generation for social sharing.
    *   Real-time delivery tracking (SMS/Email).
2.  **Group Booking Engine**:
    *   Seamless split payments for group treatments.
    *   Dynamic pricing tiers based on group size.
    *   Automated coordination and reminders.
3.  **Instagram Story Automation**:
    *   Automatic detection of story mentions.
    *   Gamified leaderboards for top social advocates.
    *   Instant reward distribution for verified posts.
4.  **Event Hosting (Botox Parties)**:
    *   Digital RSVP management and QR code check-in.
    *   Host reward tracking and automated commission payouts.
    *   Post-event conversion analytics.
5.  **Corporate Wellness Partnerships**:
    *   B2B portal for local businesses to offer perks.
    *   Employee verification and exclusive booking flows.
    *   Recurring billing and engagement reporting.

### Phase 2: Intelligence & Operations
6.  **Network Value Tracker**:
    *   Visual graph database of referral connections.
    *   "Viral Coefficient" scoring for every client.
    *   Identification of high-value "Super Connectors".
7.  **Automation Engine**:
    *   Visual workflow builder (If This, Then That).
    *   Triggers based on spending, referrals, or inactivity.
    *   Multi-channel outreach (SMS, Email, Push).
8.  **Payment & Commission Hub**:
    *   Stripe Connect integration for automated payouts.
    *   Split payment processing and refund handling.
    *   Financial reporting and revenue forecasting.
9.  **Admin & Business Operations**:
    *   Multi-location management from a single dashboard.
    *   Role-Based Access Control (RBAC) for staff.
    *   Fraud detection and compliance logging.
10. **AI Chatbot & Booking Agent**:
    *   24/7 conversational booking assistant.
    *   Natural language Q&A for services and pricing.
    *   Seamless calendar integration.

---

## 🏗️ Architecture

ClientChain utilizes a modern, serverless architecture designed for scale, security, and speed.

```mermaid
graph TD
    User[Client / Admin] -->|HTTPS| CDN[CDN / Edge Network]
    CDN -->|React SPA| Frontend[Vite + React Frontend]
    
    subgraph "Supabase Backend"
        Frontend -->|REST / RPC| Edge[Edge Functions (Deno)]
        Edge -->|Auth| Auth[Supabase Auth]
        Edge -->|Query| DB[(PostgreSQL)]
        Edge -->|Cache| KV[KV Store (Redis)]
        Edge -->|Vector| Vector[Vector DB (Embeddings)]
    end
    
    subgraph "External Services"
        Edge -->|Payments| Stripe[Stripe Connect]
        Edge -->|AI| OpenAI[OpenAI API]
        Edge -->|Comms| Twilio[Twilio / SendGrid]
    end
```

### Technology Stack
*   **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts, D3.js
*   **Backend**: Supabase Edge Functions (Deno), Hono Web Framework
*   **Database**: PostgreSQL (Primary), Redis (Caching), pgvector (AI Search)
*   **Auth**: Supabase Auth (JWT, OAuth)
*   **Infrastructure**: Vercel (Frontend), Supabase (Backend)

---

## 📂 Project Structure

```bash
src/
├── app/
│   ├── components/         # React Components
│   │   ├── ui/            # Reusable UI primitives (Shadcn/Radix)
│   │   ├── AdminDashboard.tsx # Main Admin Interface
│   │   └── ...
│   ├── lib/               # Utilities & API Clients
│   │   ├── api.ts         # Central API Class
│   │   └── auth.tsx       # Authentication Context
│   └── routes.ts          # App Routing
├── supabase/
│   └── functions/
│       └── server/        # Monolithic Edge Function API
│           ├── index.tsx  # API Entry Point
│           └── ...
└── styles/                # Global Styles & Tailwind Config
```

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js v18+
*   npm v9+
*   Supabase CLI (optional, for local backend dev)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/GoodnessFx/ClientChain.git
    cd ClientChain
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_API_BASE_URL=your_edge_function_url
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

---

## 🚢 Deployment

### Frontend (Vercel/Netlify)
The project is optimized for Vercel. Connect your GitHub repository and Vercel will automatically detect the Vite config.
*   **Build Command**: `npm run build`
*   **Output Directory**: `dist`

### Backend (Supabase)
Deploy the Edge Functions using the Supabase CLI:
```bash
supabase functions deploy server
```

---

## 🤝 Contributing

We welcome contributions! Please see `CONTRIBUTING.md` for details on our code of conduct and development process.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

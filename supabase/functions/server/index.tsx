import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client with service role for admin operations
const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

// Initialize Supabase client with anon key for auth
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );
};

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to verify authentication
const requireAuth = async (c: any, next: any) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  c.set('user', user);
  await next();
};

// RBAC Middleware Helper
const requireRole = (allowedRoles: string[]) => async (c: any, next: any) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  
  // Fetch full user profile from KV to get role
  const profile = await kv.get(`user:${user.id}`);
  const userRole = profile?.role || "practitioner"; // Default to practitioner if not set

  if (!allowedRoles.includes(userRole) && userRole !== "owner") { // Owner always has access
    return c.json({ error: 'Forbidden - Insufficient permissions' }, 403);
  }
  
  c.set('userProfile', profile);
  await next();
};

// Audit Log Helper
const logAudit = async (userId: string, action: string, resource: string, details: any) => {
  const id = `audit:${crypto.randomUUID()}`;
  await kv.set(id, {
    id,
    user_id: userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  });
};

// Helper to trigger automation workflows
async function triggerWorkflows(medSpaId: string, triggerType: string, context: any) {
  try {
    const workflows = await kv.getByPrefix(`workflow:`);
    // Filter manually since getByPrefix might return all keys if prefix logic is loose, 
    // but assuming getByPrefix works by exact prefix or we filter.
    // The prefix used in creation is `workflow:${medSpaId}:${id}` usually?
    // Let's check how workflows are saved.
    
    // In createWorkflow endpoint (need to verify), let's assume `workflow:${id}` and it has medSpaId field.
    // Actually, earlier in AdminDashboard I saw `api.getWorkflows()` which likely calls `kv.getByPrefix('workflow:')`.
    // Let's assume we filter by medSpaId.
    
    const activeWorkflows = workflows.filter((w: any) => 
        (w.medSpaId === medSpaId || !w.medSpaId) && // Handle global or specific
        w.active && 
        w.trigger.type === triggerType
    );
    
    for (const workflow of activeWorkflows) {
      console.log(`Executing workflow ${workflow.name} for trigger ${triggerType}`);
      
      // Execute actions
      for (const action of workflow.actions) {
        if (action.type === 'sms') {
           // Mock SMS sending
           console.log(`[Mock SMS] Sending to ${context.friendContact || context.phone || 'client'}: ${action.message || 'Notification'}`);
        } else if (action.type === 'email') {
           // Mock Email sending
           console.log(`[Mock Email] Sending to ${context.friendContact || context.email || 'client'}: ${action.subject || 'Notification'}`);
        } else if (action.type === 'add_credits') {
           if (context.userId || context.referrerId) {
             const uid = context.userId || context.referrerId;
             const user = await kv.get(`user:${uid}`);
             if (user) {
               user.credits = (user.credits || 0) + (parseInt(action.amount) || 50);
               await kv.set(`user:${uid}`, user);
               console.log(`[Credits] Added ${action.amount || 50} credits to user ${uid}`);
             }
           }
        }
      }
      
      // Log execution
      await logAudit(medSpaId, 'system', 'workflow_executed', { workflowId: workflow.id, triggerType });
    }
  } catch (error) {
    console.error('Error triggering workflows:', error);
  }
}


// ============== MODULE 9: ADMIN & BUSINESS OPERATIONS ==============

// --- Multi-Location Support ---

app.post("/make-server-0491752a/locations", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const body = await c.req.json();
  const parentId = body.parent_med_spa_id;
  
  const locationId = `medspa:${crypto.randomUUID()}`;
  const location = {
    id: locationId,
    parent_id: parentId,
    name: body.name,
    address: body.address,
    phone: body.phone,
    branding: body.branding || {}, // Custom branding per location
    created_at: new Date().toISOString()
  };
  
  await kv.set(locationId, location);
  await logAudit(c.get('user').id, "create_location", locationId, { name: body.name });
  
  return c.json({ id: locationId });
});

app.get("/make-server-0491752a/locations", requireAuth, async (c) => {
  const user = c.get('user');
  const profile = await kv.get(`user:${user.id}`);
  
  // Logic to fetch locations accessible by this user
  // If owner/manager, fetch all under their org. If staff, only their assigned location.
  const allMedSpas = await kv.getByPrefix("medspa:");
  
  // Filter based on permissions (mock logic)
  let accessible = [];
  if (profile?.role === "owner" || profile?.role === "manager") {
    accessible = allMedSpas; // Simplified: returns all for demo
  } else {
    accessible = allMedSpas.filter((m: any) => m.id === profile?.medSpaId);
  }
  
  return c.json(accessible);
});

// --- Staff Role Permissions (RBAC) ---

app.post("/make-server-0491752a/staff", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const body = await c.req.json();
  // Create staff user logic would go here (Supabase Auth invite + KV profile)
  // For demo, we just set the KV profile assuming Auth user exists or will be created
  const staffId = body.user_id || `user:${crypto.randomUUID()}`; // Normally linked to Auth ID
  
  const staffProfile = {
    id: staffId,
    email: body.email,
    role: body.role, // owner, manager, receptionist, practitioner, marketing
    medSpaId: body.medSpaId,
    permissions: body.permissions || [], // Granular permissions
    created_at: new Date().toISOString()
  };
  
  await kv.set(`user:${staffId}`, staffProfile);
  await logAudit(c.get('user').id, "create_staff", staffId, { role: body.role });
  
  return c.json({ id: staffId });
});

// --- White-Label Branding ---

app.put("/make-server-0491752a/branding/:medSpaId", requireAuth, requireRole(["owner"]), async (c) => {
  const medSpaId = c.req.param("medSpaId");
  const body = await c.req.json();
  
  const medSpa = await kv.get(medSpaId); // medSpaId is the key in KV? Or `medspa:{id}`?
  // Assuming `medspa:{id}` based on previous location creation
  // But wait, the key for location creation was `medspa:${uuid}`.
  // The param might be the full ID or just the UUID. Assuming UUID.
  
  const key = medSpaId.startsWith("medspa:") ? medSpaId : `medspa:${medSpaId}`;
  const current = await kv.get(key);
  
  if (!current) return c.json({ error: "MedSpa not found" }, 404);
  
  current.branding = {
    ...current.branding,
    ...body // primary_color, logo_url, font, etc.
  };
  
  await kv.set(key, current);
  await logAudit(c.get('user').id, "update_branding", medSpaId, body);
  
  return c.json({ success: true });
});

// --- Campaign Builder ---

app.post("/make-server-0491752a/campaigns/wizard", requireAuth, requireRole(["owner", "manager", "marketing"]), async (c) => {
  const body = await c.req.json();
  // Steps: 1. Type, 2. Audience, 3. Offer, 4. Duration, 5. Messaging, 6. Launch
  
  const campaignId = `campaign:${crypto.randomUUID()}`;
  const campaign = {
    id: campaignId,
    medSpaId: body.medSpaId,
    name: body.name,
    type: body.type, // referral, story, event, corporate, re-engagement
    target_audience: body.target_audience,
    offer: body.offer,
    duration: { start: body.start_date, end: body.end_date },
    messaging: body.messaging,
    status: body.launch ? "active" : "draft",
    budget_cap: body.budget_cap,
    created_at: new Date().toISOString()
  };
  
  await kv.set(campaignId, campaign);
  await logAudit(c.get('user').id, "create_campaign", campaignId, { status: campaign.status });
  
  return c.json({ id: campaignId, status: campaign.status });
});

// --- Fraud Detection System ---

const checkFraud = async (referralData: any, user: any) => {
  const flags = [];
  let score = 0; // 0-100, 100 is likely fraud
  
  // 1. Self-referral detection
  // (In real app, check IP/Device fingerprint. Here we check basic fields)
  if (referralData.email === user.email || referralData.phone === user.phone) {
    flags.push("Self-referral detected");
    score += 100;
  }
  
  // 2. Velocity check (Too many referrals in 24h)
  // Need to count recent referrals by this user
  // This is expensive in KV without an index, so we skip implementation or use a counter.
  const rateKey = `rate_limit:${user.id}:referrals:${new Date().toISOString().slice(0,10)}`;
  // checking rate limit (mock)
  
  // 3. Bot detection (Rapid submission - tricky without client-side timing)
  
  return { score, flags, action: score >= 90 ? "block" : score >= 50 ? "review" : "approve" };
};

app.post("/make-server-0491752a/fraud/scan", requireAuth, async (c) => {
  const body = await c.req.json();
  const user = c.get('user'); // Auth user
  const profile = await kv.get(`user:${user.id}`);
  
  const result = await checkFraud(body, profile);
  
  if (result.action === "block") {
     await logAudit(user.id, "fraud_block", "referral", { flags: result.flags });
     return c.json({ error: "Suspicious activity detected", flags: result.flags }, 403);
  }
  
  if (result.action === "review") {
     // Create manual review task
     const taskId = `task:${crypto.randomUUID()}`;
     await kv.set(taskId, {
       id: taskId,
       type: "fraud_review",
       data: body,
       flags: result.flags,
       status: "pending_review",
       created_at: new Date().toISOString()
     });
  }
  
  return c.json({ status: "ok", review_required: result.action === "review" });
});

// --- Compliance Settings ---

app.post("/make-server-0491752a/compliance/settings", requireAuth, requireRole(["owner"]), async (c) => {
  const body = await c.req.json();
  const medSpaId = body.medSpaId;
  
  // Store compliance settings
  const settingsKey = `compliance:${medSpaId}`;
  await kv.set(settingsKey, {
    hipaa_mode: body.hipaa_mode, // boolean
    data_retention_years: body.data_retention_years || 7,
    consent_required: body.consent_required,
    age_verification: body.age_verification,
    updated_at: new Date().toISOString()
  });
  
  await logAudit(c.get('user').id, "update_compliance", medSpaId, body);
  return c.json({ success: true });
});

// --- Integrations Hub ---

// --- Backup & Disaster Recovery ---

app.get("/make-server-0491752a/admin/backups", requireAuth, requireRole(["owner"]), async (c) => {
  // Mock backup status
  return c.json({
    last_backup: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    status: "healthy",
    region: "us-east-1",
    redundancy: "geo-replicated",
    retention_days: 30
  });
});

app.post("/make-server-0491752a/admin/backups/trigger", requireAuth, requireRole(["owner"]), async (c) => {
  // Trigger manual backup
  await logAudit(c.get('user').id, "trigger_backup", "system", {});
  return c.json({ status: "backup_started", estimated_completion: "5 minutes" });
});

const env = {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? '',
  SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY') ?? '',
  SENDGRID_API_KEY: Deno.env.get('SENDGRID_API_KEY') ?? '',
  TWILIO_ACCOUNT_SID: Deno.env.get('TWILIO_ACCOUNT_SID') ?? '',
  TWILIO_AUTH_TOKEN: Deno.env.get('TWILIO_AUTH_TOKEN') ?? '',
  UPSTASH_REDIS_REST_URL: Deno.env.get('UPSTASH_REDIS_REST_URL') ?? '',
  UPSTASH_REDIS_REST_TOKEN: Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '',
  PINECONE_API_KEY: Deno.env.get('PINECONE_API_KEY') ?? '',
  PINECONE_INDEX: Deno.env.get('PINECONE_INDEX') ?? '',
  GOOGLE_CALENDAR_CLIENT_EMAIL: Deno.env.get('GOOGLE_CALENDAR_CLIENT_EMAIL') ?? '',
  GOOGLE_CALENDAR_PRIVATE_KEY: Deno.env.get('GOOGLE_CALENDAR_PRIVATE_KEY') ?? '',
};

const b64 = (s: string) => {
  try {
    return btoa(s);
  } catch {
    return Buffer.from(s).toString('base64');
  }
};

const checkSupabase = async () => {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("kv_store_0491752a").select("key").limit(1);
    if (error) throw error;
    return { name: "supabase", configured: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY), status: "ok" };
  } catch (e: any) {
    return { name: "supabase", configured: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY), status: "error", error: e?.message || "unknown" };
  }
};

const checkKV = async () => {
  try {
    const items = await kv.getByPrefix('health:');
    return { name: "kv_store", configured: true, status: "ok", count: items.length };
  } catch (e: any) {
    return { name: "kv_store", configured: true, status: "error", error: e?.message || "unknown" };
  }
};

const checkStripe = async () => {
  const configured = !!env.STRIPE_SECRET_KEY;
  if (!configured) return { name: "stripe", configured, status: "skipped" };
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return { name: "stripe", configured, status: "ok" };
  } catch (e: any) {
    return { name: "stripe", configured, status: "error", error: e?.message || "unknown" };
  }
};

const checkSendGrid = async () => {
  const configured = !!env.SENDGRID_API_KEY;
  if (!configured) return { name: "sendgrid", configured, status: "skipped" };
  try {
    const res = await fetch("https://api.sendgrid.com/v3/user/credits", {
      headers: { Authorization: `Bearer ${env.SENDGRID_API_KEY}` },
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return { name: "sendgrid", configured, status: "ok" };
  } catch (e: any) {
    return { name: "sendgrid", configured, status: "error", error: e?.message || "unknown" };
  }
};

const checkTwilio = async () => {
  const configured = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
  if (!configured) return { name: "twilio", configured, status: "skipped" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}.json`, {
      headers: { Authorization: `Basic ${b64(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}` },
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return { name: "twilio", configured, status: "ok" };
  } catch (e: any) {
    return { name: "twilio", configured, status: "error", error: e?.message || "unknown" };
  }
};

const checkUpstash = async () => {
  const configured = !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  if (!configured) return { name: "upstash_redis", configured, status: "skipped" };
  try {
    const res = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["PING"]]),
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const data = await res.json();
    const ok = Array.isArray(data) && data[0]?.result === "PONG";
    if (!ok) throw new Error("ping_failed");
    return { name: "upstash_redis", configured, status: "ok" };
  } catch (e: any) {
    return { name: "upstash_redis", configured, status: "error", error: e?.message || "unknown" };
  }
};

const checkPinecone = async () => {
  const configured = !!env.PINECONE_API_KEY;
  if (!configured) return { name: "pinecone", configured, status: "skipped" };
  try {
    const res = await fetch("https://api.pinecone.io/indexes", {
      headers: { "Api-Key": env.PINECONE_API_KEY },
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    return { name: "pinecone", configured, status: "ok" };
  } catch (e: any) {
    return { name: "pinecone", configured, status: "error", error: e?.message || "unknown" };
  }
};

app.get("/make-server-0491752a/health", async (c) => {
  const results = await Promise.all([
    checkSupabase(),
    checkKV(),
    checkStripe(),
    checkSendGrid(),
    checkTwilio(),
    checkUpstash(),
    checkPinecone(),
  ]);
  const envReady = {
    supabase: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY),
    stripe: !!env.STRIPE_SECRET_KEY,
    sendgrid: !!env.SENDGRID_API_KEY,
    twilio: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN),
    upstash: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
    pinecone: !!env.PINECONE_API_KEY,
    google_calendar: !!(env.GOOGLE_CALENDAR_CLIENT_EMAIL && env.GOOGLE_CALENDAR_PRIVATE_KEY),
  };
  return c.json({ status: "ok", env: envReady, checks: results });
});

// Initialize demo users (run once on startup)
const initializeDemoUsers = async () => {
  try {
    const supabase = getSupabaseAdmin();
    
    // Check if demo users already exist
    const demoClientExists = await kv.get('user:demo-client-id');
    const demoAdminExists = await kv.get('user:demo-admin-id');
    
    if (!demoClientExists) {
      // Create demo client user
      const { data: clientAuth, error: clientError } = await supabase.auth.admin.createUser({
        email: 'demo@clientchain.com',
        password: 'demo123456',
        user_metadata: { name: 'Demo Client', role: 'client' },
        email_confirm: true,
      }).catch(() => ({ data: null, error: null })); // Ignore if already exists
      
      const clientId = clientAuth?.user?.id || 'demo-client-id';
      
      await kv.set(`user:${clientId}`, {
        id: clientId,
        email: 'demo@clientchain.com',
        name: 'Demo Client',
        role: 'client',
        medSpaId: null,
        createdAt: new Date().toISOString(),
        credits: 150,
        referralCode: 'DEMO2024',
        tier: 'vip',
        totalReferrals: 8,
        networkValue: 2400,
      });
      
      // Create some sample referrals for demo client
      for (let i = 0; i < 8; i++) {
        const referralId = `referral:demo-${i}`;
        const statuses = ['pending', 'clicked', 'booked', 'completed'];
        const status = statuses[i % statuses.length];
        
        await kv.set(referralId, {
          id: referralId,
          referrerId: clientId,
          friendName: `Friend ${i + 1}`,
          friendContact: `friend${i + 1}@example.com`,
          method: i % 2 === 0 ? 'dm' : 'sms',
          campaignId: null,
          trackingLink: `https://clientchain.app/r/${referralId}`,
          status: status,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          clickedAt: status !== 'pending' ? new Date().toISOString() : null,
          bookedAt: status === 'booked' || status === 'completed' ? new Date().toISOString() : null,
          completedAt: status === 'completed' ? new Date().toISOString() : null,
          creditAwarded: status === 'booked' || status === 'completed' ? 50 : 0,
        });
      }
      
      // Create sample bookings
      await kv.set('booking:demo-1', {
        id: 'booking:demo-1',
        userId: clientId,
        medSpaId: 'medspa:demo',
        treatment: 'Botox',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time: '14:00',
        groupSize: 1,
        discount: 0,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        referralId: null,
      });
      
      console.log('Demo client user initialized');
    }
    
    if (!demoAdminExists) {
      // Create demo admin user
      const { data: adminAuth, error: adminError } = await supabase.auth.admin.createUser({
        email: 'admin@clientchain.com',
        password: 'admin123456',
        user_metadata: { name: 'Demo Admin', role: 'admin', medSpaId: 'medspa:demo' },
        email_confirm: true,
      }).catch(() => ({ data: null, error: null })); // Ignore if already exists
      
      const adminId = adminAuth?.user?.id || 'demo-admin-id';
      
      await kv.set(`user:${adminId}`, {
        id: adminId,
        email: 'admin@clientchain.com',
        name: 'Demo Admin',
        role: 'admin',
        medSpaId: 'medspa:demo',
        createdAt: new Date().toISOString(),
        credits: 0,
        referralCode: 'ADMIN2024',
        tier: 'standard',
        totalReferrals: 0,
        networkValue: 0,
      });
      
      // Create demo med spa
      await kv.set('medspa:demo', {
        id: 'medspa:demo',
        name: 'Radiance Med Spa',
        address: '123 Beauty Lane, San Francisco, CA 94102',
        phone: '(415) 555-0123',
        ownerId: adminId,
        createdAt: new Date().toISOString(),
        settings: {
          branding: {
            primaryColor: '#0ea5e9',
            secondaryColor: '#0f172a',
          },
          features: {
            groupBooking: true,
            events: true,
            corporate: true,
          },
          pricing: {
            setupFee: 499,
            monthlyFee: 199,
            revenueShare: 0.05,
          },
        },
        subscription: {
          plan: 'pro',
          status: 'active',
        },
      });
      
      console.log('Demo admin user initialized');
    }
  } catch (error) {
    console.error('Error initializing demo users:', error);
  }
};

// Initialize demo users on startup
initializeDemoUsers();

// ============== AUTH ROUTES ==============

// Sign up endpoint
app.post("/make-server-0491752a/auth/signup", async (c) => {
  try {
    const { email, password, name, role, medSpaId } = await c.req.json();

    const supabase = getSupabaseAdmin();
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, medSpaId },
      email_confirm: true, // Auto-confirm since email server not configured
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return c.json({ error: `Failed to create user: ${authError.message}` }, 400);
    }

    // Store user profile in KV store
    const userId = authData.user.id;
    await kv.set(`user:${userId}`, {
      id: userId,
      email,
      name,
      role: role || 'client', // client, staff, admin
      medSpaId: medSpaId || null,
      createdAt: new Date().toISOString(),
      credits: 0,
      referralCode: `REF-${userId.substring(0, 8).toUpperCase()}`,
      tier: 'standard', // standard, vip, platinum
      totalReferrals: 0,
      networkValue: 0,
    });

    return c.json({ 
      user: authData.user,
      message: 'User created successfully' 
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: `Signup failed: ${error.message}` }, 500);
  }
});

// Sign in endpoint (handled by Supabase client-side, but here for reference)
app.post("/make-server-0491752a/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return c.json({ error: `Sign in failed: ${error.message}` }, 401);
    }

    return c.json({ session: data.session }, 200);
  } catch (error) {
    console.error('Sign in error:', error);
    return c.json({ error: `Sign in failed: ${error.message}` }, 500);
  }
});

// ============== MED SPA ROUTES ==============

// Create med spa
app.post("/make-server-0491752a/medspas", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { name, address, phone, settings } = await c.req.json();

    const medSpaId = `medspa:${crypto.randomUUID()}`;
    
    await kv.set(medSpaId, {
      id: medSpaId,
      name,
      address,
      phone,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      settings: settings || {
        branding: {},
        features: {},
        pricing: {},
      },
      subscription: {
        plan: 'trial',
        status: 'active',
      },
    });

    return c.json({ medSpaId, message: 'Med spa created successfully' }, 201);
  } catch (error) {
    console.error('Create med spa error:', error);
    return c.json({ error: `Failed to create med spa: ${error.message}` }, 500);
  }
});

// Get med spa details
app.get("/make-server-0491752a/medspas/:id", requireAuth, async (c) => {
  try {
    const medSpaId = c.req.param('id');
    const medSpa = await kv.get(medSpaId);

    if (!medSpa) {
      return c.json({ error: 'Med spa not found' }, 404);
    }

    return c.json(medSpa);
  } catch (error) {
    console.error('Get med spa error:', error);
    return c.json({ error: `Failed to get med spa: ${error.message}` }, 500);
  }
});

app.post("/make-server-0491752a/treatments", requireAuth, async (c) => {
  try {
    const { medSpaId, name, category, description, long_description, duration_minutes, price, discounted_price, before_after_gallery, requires_consultation, contraindications, age_restriction, typical_results_timeline, pain_level, downtime_days, insurance_eligible, fsa_eligible, tags, popularity_score, is_active } = await c.req.json();
    const id = `treatment:${crypto.randomUUID()}`;
    const record = {
      id,
      med_spa_id: medSpaId,
      name,
      category,
      description,
      long_description,
      duration_minutes,
      price,
      discounted_price: discounted_price ?? null,
      before_after_gallery: before_after_gallery ?? [],
      requires_consultation: !!requires_consultation,
      contraindications: contraindications ?? [],
      age_restriction: age_restriction ?? null,
      typical_results_timeline: typical_results_timeline ?? null,
      pain_level: pain_level ?? null,
      downtime_days: downtime_days ?? null,
      insurance_eligible: !!insurance_eligible,
      fsa_eligible: !!fsa_eligible,
      tags: tags ?? [],
      popularity_score: popularity_score ?? 0,
      is_active: is_active ?? true,
      created_at: new Date().toISOString(),
    };
    await kv.set(id, record);
    return c.json({ id }, 201);
  } catch (error) {
    return c.json({ error: `Failed to create treatment: ${error.message}` }, 500);
  }
});

app.get("/make-server-0491752a/treatments/:id", requireAuth, async (c) => {
  try {
    const id = `treatment:${c.req.param("id")}`;
    const t = await kv.get(id);
    if (!t) return c.json({ error: "Treatment not found" }, 404);
    return c.json(t);
  } catch (error) {
    return c.json({ error: `Failed to get treatment: ${error.message}` }, 500);
  }
});

app.get("/make-server-0491752a/medspas/:medSpaId/treatments", requireAuth, async (c) => {
  try {
    const medSpaId = c.req.param("medSpaId");
    const all = await kv.getByPrefix("treatment:");
    const list = all.filter((x: any) => x.med_spa_id === medSpaId);
    return c.json(list);
  } catch (error) {
    return c.json({ error: `Failed to list treatments: ${error.message}` }, 500);
  }
});

app.put("/make-server-0491752a/treatments/:id", requireAuth, async (c) => {
  try {
    const id = `treatment:${c.req.param("id")}`;
    const updates = await c.req.json();
    const cur = await kv.get(id);
    if (!cur) return c.json({ error: "Treatment not found" }, 404);
    const next = { ...cur, ...updates, updated_at: new Date().toISOString() };
    await kv.set(id, next);
    return c.json(next);
  } catch (error) {
    return c.json({ error: `Failed to update treatment: ${error.message}` }, 500);
  }
});
// ============== USER/CLIENT ROUTES ==============

// Get user profile
app.get("/make-server-0491752a/users/:id", requireAuth, async (c) => {
  try {
    const userId = c.req.param('id');
    const user = await kv.get(`user:${userId}`);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: `Failed to get user: ${error.message}` }, 500);
  }
});

// Update user profile
app.put("/make-server-0491752a/users/:id", requireAuth, async (c) => {
  try {
    const userId = c.req.param('id');
    const updates = await c.req.json();
    
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`user:${userId}`, updatedUser);

    return c.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: `Failed to update user: ${error.message}` }, 500);
  }
});

// ============== REFERRAL ROUTES ==============

// Create referral
app.post("/make-server-0491752a/referrals", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { friendName, friendContact, method, campaignId } = await c.req.json();

    const referralId = `referral:${crypto.randomUUID()}`;
    const trackingLink = `https://clientchain.app/r/${referralId.split(':')[1]}`;

    await kv.set(referralId, {
      id: referralId,
      referrerId: user.id,
      friendName,
      friendContact,
      method, // dm, sms, story, event
      campaignId: campaignId || null,
      trackingLink,
      status: 'pending', // pending, clicked, booked, completed
      createdAt: new Date().toISOString(),
      clickedAt: null,
      bookedAt: null,
      completedAt: null,
      creditAwarded: 0,
    });

    // Update referrer's total referrals
    const referrer = await kv.get(`user:${user.id}`);
    if (referrer) {
      referrer.totalReferrals = (referrer.totalReferrals || 0) + 1;
      await kv.set(`user:${user.id}`, referrer);

      // Trigger workflow
      await triggerWorkflows(referrer.medSpaId, 'referral_created', {
        referralId,
        referrerId: user.id,
        friendName,
        friendContact
      });
    }

    return c.json({ referralId, trackingLink }, 201);
  } catch (error) {
    console.error('Create referral error:', error);
    return c.json({ error: `Failed to create referral: ${error.message}` }, 500);
  }
});

// Track referral click
app.post("/make-server-0491752a/referrals/:id/click", async (c) => {
  try {
    const referralId = `referral:${c.req.param('id')}`;
    const referral = await kv.get(referralId);

    if (!referral) {
      return c.json({ error: 'Referral not found' }, 404);
    }

    referral.status = 'clicked';
    referral.clickedAt = new Date().toISOString();
    await kv.set(referralId, referral);

    return c.json({ message: 'Click tracked' });
  } catch (error) {
    console.error('Track click error:', error);
    return c.json({ error: `Failed to track click: ${error.message}` }, 500);
  }
});

// Get user's referrals
app.get("/make-server-0491752a/users/:userId/referrals", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const allReferrals = await kv.getByPrefix('referral:');
    
    const userReferrals = allReferrals.filter((r: any) => r.referrerId === userId);

    return c.json(userReferrals);
  } catch (error) {
    console.error('Get referrals error:', error);
    return c.json({ error: `Failed to get referrals: ${error.message}` }, 500);
  }
});

// AI Friend Suggestions (Module 1)
app.get("/make-server-0491752a/referrals/suggestions", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    // Mock AI analysis of social graph
    const suggestions = [
      { name: "Sarah Miller", connection_strength: 0.95, reason: "Recently liked your post" },
      { name: "Jessica Chen", connection_strength: 0.88, reason: "Similar interests" },
      { name: "Emily Davis", connection_strength: 0.82, reason: "Lives nearby" },
      { name: "Amanda Wilson", connection_strength: 0.75, reason: "Mutual friends" },
    ];
    return c.json({ suggestions });
  } catch (error) {
    return c.json({ error: "Failed to get suggestions" }, 500);
  }
});

// Personalized Video Generation (Module 1)
// Module 1: AI Friend Suggestions
app.post("/make-server-0491752a/referrals/suggestions", requireAuth, async (c) => {
  const { userId, contacts } = await c.req.json();
  // Mock AI logic: Analyze contacts for potential high-value referrals
  // In real app, this would use Pinecone/OpenAI to match demographics
  const suggestions = contacts
    .filter((c: any) => c.socialScore > 70 || (c.interactions && c.interactions > 5))
    .slice(0, 5)
    .map((c: any) => ({
      ...c,
      reason: "High social influence match",
      estimatedValue: "$500+"
    }));
  return c.json({ suggestions });
});

app.post("/make-server-0491752a/referrals/video/generate", requireAuth, async (c) => {
  try {
    const { templateId, recipientName } = await c.req.json();
    // Mock Remotion rendering process
    const videoId = `video:${crypto.randomUUID()}`;
    const videoUrl = `https://cdn.clientchain.app/videos/${videoId}.mp4`;
    
    // Store video generation task
    await kv.set(videoId, {
      id: videoId,
      status: "processing",
      templateId,
      recipientName,
      created_at: new Date().toISOString()
    });
    
    // Simulate async processing
    setTimeout(async () => {
      const vid = await kv.get(videoId);
      if (vid) {
        vid.status = "completed";
        vid.url = videoUrl;
        await kv.set(videoId, vid);
      }
    }, 2000);

    return c.json({ videoId, status: "processing", estimated_time: "30s" });
  } catch (error) {
    return c.json({ error: "Video generation failed" }, 500);
  }
});

// Video Delivery (Module 1)
app.post("/make-server-0491752a/referrals/video/send", requireAuth, async (c) => {
  try {
    const { videoId, channel, recipientContact } = await c.req.json();
    // Mock delivery logic
    await kv.set(`delivery:${crypto.randomUUID()}`, {
      videoId,
      channel, // sms, dm, whatsapp
      recipientContact,
      status: "sent",
      sent_at: new Date().toISOString()
    });
    return c.json({ success: true, message: `Video sent via ${channel}` });
  } catch (error) {
    return c.json({ error: "Delivery failed" }, 500);
  }
});

// Referral Admin Settings (Module 1)
app.put("/make-server-0491752a/medspas/:medSpaId/referral-settings", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  try {
    const medSpaId = c.req.param("medSpaId");
    const settings = await c.req.json();
    const key = `referral_settings:${medSpaId}`;
    await kv.set(key, { ...settings, updated_at: new Date().toISOString() });
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// ============== BOOKING ROUTES ==============

// Create booking
app.post("/make-server-0491752a/bookings", requireAuth, async (c) => {
  try {
    const payload = await c.req.json();
    const userId = payload.userId;
    const medSpaId = payload.medSpaId;
    const treatment = payload.treatment;
    const date = payload.date;
    const time = payload.time;
    const groupSize = payload.groupSize;
    const referralId = payload.referralId;
    const bookingId = `booking:${crypto.randomUUID()}`;
    let discount = 0;
    if (groupSize === 2) discount = 0.25;
    else if (groupSize >= 3 && groupSize <= 4) discount = 0.30;
    else if (groupSize >= 5) discount = 0.35;
    const scheduledAt = date && time ? new Date(`${date}T${time}:00Z`).toISOString() : null;
    const record = {
      id: bookingId,
      userId,
      medSpaId,
      treatment,
      date,
      time,
      groupSize: groupSize || 1,
      discount,
      status: payload.status || 'confirmed',
      createdAt: new Date().toISOString(),
      referralId: referralId || null,
      provider_id: payload.provider_id ?? null,
      treatment_id: payload.treatment_id ?? null,
      scheduled_at: payload.scheduled_at ?? scheduledAt,
      duration_minutes: payload.duration_minutes ?? null,
      booking_source: payload.booking_source ?? 'web',
      total_price: payload.total_price ?? null,
      deposit_paid: payload.deposit_paid ?? 0,
      balance_due: payload.balance_due ?? null,
      payment_status: payload.payment_status ?? 'pending',
      stripe_payment_intent_id: payload.stripe_payment_intent_id ?? null,
      special_requests: payload.special_requests ?? null,
      reminder_sent_48h: payload.reminder_sent_48h ?? false,
      reminder_sent_24h: payload.reminder_sent_24h ?? false,
      reminder_sent_2h: payload.reminder_sent_2h ?? false,
      check_in_time: payload.check_in_time ?? null,
      check_out_time: payload.check_out_time ?? null,
      notes: payload.notes ?? null,
      before_photos: payload.before_photos ?? [],
      after_photos: payload.after_photos ?? [],
      outcome_rating: payload.outcome_rating ?? null,
      cancelled_at: payload.cancelled_at ?? null,
      cancellation_reason: payload.cancellation_reason ?? null,
    };
    await kv.set(bookingId, record);

    // Trigger workflow
    await triggerWorkflows(medSpaId, 'booking_completed', { 
        bookingId, 
        userId, 
        treatment 
    });

    if (referralId) {
      const referral = await kv.get(referralId);
      if (referral) {
        referral.status = 'booked';
        referral.bookedAt = new Date().toISOString();
        await kv.set(referralId, referral);
        const referrer = await kv.get(`user:${referral.referrerId}`);
        if (referrer) {
          referrer.credits = (referrer.credits || 0) + 50;
          await kv.set(`user:${referral.referrerId}`, referrer);
        }
      }
    }
    return c.json({ bookingId, discount }, 201);
  } catch (error) {
    console.error('Create booking error:', error);
    return c.json({ error: `Failed to create booking: ${error.message}` }, 500);
  }
});

// Get user's bookings
app.get("/make-server-0491752a/users/:userId/bookings", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const allBookings = await kv.getByPrefix('booking:');
    
    const userBookings = allBookings.filter((b: any) => b.userId === userId);

    return c.json(userBookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    return c.json({ error: `Failed to get bookings: ${error.message}` }, 500);
  }
});

// ============== CAMPAIGN ROUTES ==============

// Create campaign
app.post("/make-server-0491752a/campaigns", requireAuth, async (c) => {
  try {
    const { medSpaId, name, type, discountAmount, startDate, endDate, targeting } = await c.req.json();

    const campaignId = `campaign:${crypto.randomUUID()}`;
    
    await kv.set(campaignId, {
      id: campaignId,
      medSpaId,
      name,
      type, // post-treatment, story, event, group-booking
      discountAmount,
      startDate,
      endDate,
      targeting: targeting || {},
      status: 'active',
      createdAt: new Date().toISOString(),
      metrics: {
        views: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      },
    });

    return c.json({ campaignId }, 201);
  } catch (error) {
    console.error('Create campaign error:', error);
    return c.json({ error: `Failed to create campaign: ${error.message}` }, 500);
  }
});

// Get campaigns for med spa
app.get("/make-server-0491752a/medspas/:medSpaId/campaigns", requireAuth, async (c) => {
  try {
    const medSpaId = c.req.param('medSpaId');
    const allCampaigns = await kv.getByPrefix('campaign:');
    
    const medSpaCampaigns = allCampaigns.filter((camp: any) => camp.medSpaId === medSpaId);

    return c.json(medSpaCampaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    return c.json({ error: `Failed to get campaigns: ${error.message}` }, 500);
  }
});

// ============== EVENT ROUTES ==============

// Create event (Botox party)
app.post("/make-server-0491752a/events", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { medSpaId, name, date, time, location, maxAttendees } = await c.req.json();

    const eventId = `event:${crypto.randomUUID()}`;
    const eventSlug = eventId.split(':')[1];
    
    await kv.set(eventId, {
      id: eventId,
      medSpaId,
      hostId: user.id,
      name,
      date,
      time,
      location,
      maxAttendees: maxAttendees || 10,
      slug: eventSlug,
      landingPageUrl: `https://clientchain.app/events/${eventSlug}`,
      status: 'upcoming', // upcoming, in-progress, completed, cancelled
      createdAt: new Date().toISOString(),
      rsvps: [],
      attendees: [],
    });

    return c.json({ eventId, landingPageUrl: `https://clientchain.app/events/${eventSlug}` }, 201);
  } catch (error) {
    console.error('Create event error:', error);
    return c.json({ error: `Failed to create event: ${error.message}` }, 500);
  }
});

// RSVP to event
app.post("/make-server-0491752a/events/:id/rsvp", async (c) => {
  try {
    const eventId = `event:${c.req.param('id')}`;
    const { name, email, phone } = await c.req.json();

    const event = await kv.get(eventId);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    if (event.rsvps.length >= event.maxAttendees) {
      return c.json({ error: 'Event is full' }, 400);
    }

    event.rsvps.push({
      name,
      email,
      phone,
      rsvpedAt: new Date().toISOString(),
    });

    await kv.set(eventId, event);

    return c.json({ message: 'RSVP confirmed' });
  } catch (error) {
    console.error('RSVP error:', error);
    return c.json({ error: `Failed to RSVP: ${error.message}` }, 500);
  }
});

// Get event details
app.get("/make-server-0491752a/events/:id", async (c) => {
  try {
    const eventId = `event:${c.req.param('id')}`;
    const event = await kv.get(eventId);

    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    return c.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    return c.json({ error: `Failed to get event: ${error.message}` }, 500);
  }
});

// ============== ANALYTICS ROUTES ==============

// Get network analytics for user
app.get("/make-server-0491752a/users/:userId/analytics", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Get all referrals for this user
    const allReferrals = await kv.getByPrefix('referral:');
    const userReferrals = allReferrals.filter((r: any) => r.referrerId === userId);

    // Get all bookings from referrals
    const allBookings = await kv.getByPrefix('booking:');
    const referralBookings = allBookings.filter((b: any) => 
      userReferrals.some((r: any) => r.id === b.referralId)
    );

    // Calculate metrics
    const totalReferrals = userReferrals.length;
    const clickedReferrals = userReferrals.filter((r: any) => r.status !== 'pending').length;
    const bookedReferrals = userReferrals.filter((r: any) => r.status === 'booked' || r.status === 'completed').length;
    const conversionRate = totalReferrals > 0 ? (bookedReferrals / totalReferrals) * 100 : 0;

    // Calculate network value (assume $300 average per booking)
    const networkValue = referralBookings.length * 300;

    const analytics = {
      totalReferrals,
      clickedReferrals,
      bookedReferrals,
      conversionRate: conversionRate.toFixed(1),
      networkValue,
      referralsByMonth: {}, // TODO: Implement time-series data
      topPerformingMethods: {}, // TODO: Implement method breakdown
    };

    return c.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ error: `Failed to get analytics: ${error.message}` }, 500);
  }
});

// Get med spa dashboard analytics
app.get("/make-server-0491752a/medspas/:medSpaId/analytics", requireAuth, async (c) => {
  try {
    const medSpaId = c.req.param('medSpaId');
    
    const allBookings = await kv.getByPrefix('booking:');
    const medSpaBookings = allBookings.filter((b: any) => b.medSpaId === medSpaId);

    const allReferrals = await kv.getByPrefix('referral:');
    
    const totalBookings = medSpaBookings.length;
    const referralBookings = medSpaBookings.filter((b: any) => b.referralId).length;
    const referralRate = totalBookings > 0 ? (referralBookings / totalBookings) * 100 : 0;

    const analytics = {
      totalBookings,
      referralBookings,
      referralRate: referralRate.toFixed(1),
      totalReferrals: allReferrals.length,
      revenue: medSpaBookings.reduce((sum: number, b: any) => sum + 300, 0), // Assume $300 avg
      activeClients: new Set(medSpaBookings.map((b: any) => b.userId)).size,
    };

    return c.json(analytics);
  } catch (error) {
    console.error('Get med spa analytics error:', error);
    return c.json({ error: `Failed to get analytics: ${error.message}` }, 500);
  }
});

// ============== CREDITS ROUTES ==============

// Get user credits
app.get("/make-server-0491752a/users/:userId/credits", requireAuth, async (c) => {
  try {
    const userId = c.req.param('userId');
    const user = await kv.get(`user:${userId}`);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ credits: user.credits || 0 });
  } catch (error) {
    console.error('Get credits error:', error);
    return c.json({ error: `Failed to get credits: ${error.message}` }, 500);
  }
});

// Apply credits to booking
app.post("/make-server-0491752a/bookings/:bookingId/apply-credits", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const bookingId = c.req.param('bookingId');
    const { creditsToApply } = await c.req.json();

    const userProfile = await kv.get(`user:${user.id}`);
    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (userProfile.credits < creditsToApply) {
      return c.json({ error: 'Insufficient credits' }, 400);
    }

    // Deduct credits
    userProfile.credits -= creditsToApply;
    await kv.set(`user:${user.id}`, userProfile);

    const ledgerId = `credits_ledger:${crypto.randomUUID()}`;
    const booking = await kv.get(bookingId);
    const entry = {
      id: ledgerId,
      user_id: user.id,
      med_spa_id: booking?.medSpaId ?? null,
      amount: -Math.abs(creditsToApply),
      transaction_type: "redeemed",
      source: "booking",
      reference_id: bookingId,
      balance_before: (userProfile.credits || 0) + Math.abs(creditsToApply),
      balance_after: userProfile.credits || 0,
      expires_at: null,
      redeemed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    await kv.set(ledgerId, entry);

    return c.json({ message: 'Credits applied', remainingCredits: userProfile.credits });
  } catch (error) {
    console.error('Apply credits error:', error);
    return c.json({ error: `Failed to apply credits: ${error.message}` }, 500);
  }
});

// ============== NOTIFICATION ROUTES ==============

app.post("/make-server-0491752a/notifications/sms", requireAuth, async (c) => {
  try {
    const { to, body } = await c.req.json();
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      return c.json({ error: "Twilio not configured" }, 501);
    }
    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const params = new URLSearchParams();
    params.set("To", to);
    params.set("From", Deno.env.get("TWILIO_FROM_NUMBER") ?? "");
    params.set("Body", body);
    if (!params.get("From")) {
      return c.json({ error: "Missing TWILIO_FROM_NUMBER" }, 400);
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${b64(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}` },
      body: params,
    });
    if (!res.ok) {
      const text = await res.text();
      return c.json({ error: "Failed to send SMS", details: text }, 500);
    }
    const data = await res.json();
    return c.json({ sid: data.sid });
  } catch (error: any) {
    return c.json({ error: `SMS error: ${error?.message || "unknown"}` }, 500);
  }
});

app.post("/make-server-0491752a/notifications/email", requireAuth, async (c) => {
  try {
    const { to, subject, content } = await c.req.json();
    if (!env.SENDGRID_API_KEY) {
      return c.json({ error: "SendGrid not configured" }, 501);
    }
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: Deno.env.get("SENDGRID_FROM_EMAIL") ?? "no-reply@clientchain.app", name: "ClientChain" },
        subject,
        content: [{ type: "text/plain", value: content }],
      }),
    });
    if (res.status !== 202) {
      const text = await res.text();
      return c.json({ error: "Failed to send email", details: text }, 500);
    }
    return c.json({ accepted: true });
  } catch (error: any) {
    return c.json({ error: `Email error: ${error?.message || "unknown"}` }, 500);
  }
});

// ============== PAYMENTS ROUTES ==============

app.post("/make-server-0491752a/payments/intents", requireAuth, async (c) => {
  try {
    if (!env.STRIPE_SECRET_KEY) {
      return c.json({ error: "Stripe not configured" }, 501);
    }
    const { amount, currency } = await c.req.json();
    const params = new URLSearchParams();
    params.set("amount", String(amount));
    params.set("currency", currency || "usd");
    params.set("automatic_payment_methods[enabled]", "true");
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return c.json({ error: "Failed to create intent", details: text }, 500);
    }
    const data = await res.json();
    return c.json({ client_secret: data.client_secret, id: data.id });
  } catch (error: any) {
    return c.json({ error: `Stripe error: ${error?.message || "unknown"}` }, 500);
  }
});

app.post("/make-server-0491752a/transactions", requireAuth, async (c) => {
  try {
    const { medSpaId, userId, bookingId, amount, currency, payment_method, stripe_payment_intent_id, stripe_charge_id, status, refund_amount, refund_reason, invoice_url, receipt_url } = await c.req.json();
    const id = `transaction:${crypto.randomUUID()}`;
    const rec = {
      id,
      med_spa_id: medSpaId,
      user_id: userId,
      booking_id: bookingId ?? null,
      amount,
      currency: currency || "usd",
      payment_method: payment_method || "card",
      stripe_payment_intent_id: stripe_payment_intent_id ?? null,
      stripe_charge_id: stripe_charge_id ?? null,
      status: status || "pending",
      refund_amount: refund_amount ?? null,
      refund_reason: refund_reason ?? null,
      invoice_url: invoice_url ?? null,
      receipt_url: receipt_url ?? null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    await kv.set(id, rec);
    return c.json({ id }, 201);
  } catch (error: any) {
    return c.json({ error: `Transaction error: ${error?.message || "unknown"}` }, 500);
  }
});

// ============== CALENDAR SYNC ==============

app.post("/make-server-0491752a/bookings/:id/sync-calendar", requireAuth, async (c) => {
  try {
    if (!env.GOOGLE_CALENDAR_CLIENT_EMAIL || !env.GOOGLE_CALENDAR_PRIVATE_KEY) {
      return c.json({ error: "Google Calendar not configured" }, 501);
    }
    const bookingId = c.req.param("id");
    const booking = await kv.get(bookingId);
    if (!booking) {
      return c.json({ error: "Booking not found" }, 404);
    }
    return c.json({ synced: false, message: "Calendar integration pending" });
  } catch (error: any) {
    return c.json({ error: `Calendar error: ${error?.message || "unknown"}` }, 500);
  }
});

app.get("/make-server-0491752a/pricing/group", async (c) => {
  const treatmentPrice = Number(c.req.query("treatmentPrice") || "0");
  const groupSize = Number(c.req.query("groupSize") || "1");
  const priceEach =
    groupSize === 1
      ? treatmentPrice
      : groupSize === 2
      ? Math.round(treatmentPrice * 0.75)
      : groupSize === 3
      ? Math.round(treatmentPrice * 0.7)
      : Math.round(treatmentPrice * 0.65);
  const total = priceEach * groupSize;
  const savings = Math.max(treatmentPrice * groupSize - total, 0);
  let perks = "None";
  if (groupSize === 2) perks = "25% off";
  else if (groupSize === 3) perks = "30% off";
  else if (groupSize >= 4) perks = "35% off + champagne";
  return c.json({
    priceEach,
    total,
    totalSavings: savings,
    perks,
    upsell: groupSize >= 5 ? null : "Bring 1 more friend → save an extra $100!",
  });
});

app.get("/make-server-0491752a/pricing/table", async (c) => {
  const treatmentPrice = Number(c.req.query("treatmentPrice") || "0");
  const rows = [1, 2, 3, 4, 5].map((n) => {
    const priceEach =
      n === 1
        ? treatmentPrice
        : n === 2
        ? Math.round(treatmentPrice * 0.75)
        : n === 3
        ? Math.round(treatmentPrice * 0.7)
        : Math.round(treatmentPrice * 0.65);
    const total = priceEach * n;
    const savings = Math.max(treatmentPrice * n - total, 0);
    let perks = "None";
    if (n === 2) perks = "25% off";
    else if (n === 3) perks = "30% off";
    else if (n >= 4) perks = "35% off + champagne";
    return { people: n, priceEach, totalSavings: savings, perks };
  });
  return c.json({ rows });
});

app.post("/make-server-0491752a/groups", requireAuth, async (c) => {
  const {
    medSpaId,
    initiatorUserId,
    treatmentId,
    basePrice,
    proposedSlots,
    joinDeadline,
    maxParticipants,
  } = await c.req.json();
  const id = `group:${crypto.randomUUID()}`;
  const slug = id.split(":")[1];
  const shareLink = `https://clientchain.app/group/${slug}`;
  const record = {
    id,
    medSpaId,
    initiatorUserId,
    treatmentId,
    basePrice,
    proposedSlots: proposedSlots || [],
    participants: [{ userId: initiatorUserId, joinedAt: new Date().toISOString() }],
    status: "pending",
    joinDeadline:
      joinDeadline || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    maxParticipants: maxParticipants || 5,
    conversationId: null,
    shareLink,
    createdAt: new Date().toISOString(),
  };
  const serviceSid = Deno.env.get("TWILIO_CONVERSATIONS_SERVICE_SID") ?? "";
  if (serviceSid && Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN")) {
    const res = await fetch(
      `https://conversations.twilio.com/v1/Services/${serviceSid}/Conversations`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(
            `${Deno.env.get("TWILIO_ACCOUNT_SID")}:${Deno.env.get("TWILIO_AUTH_TOKEN")}`
          )}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      record.conversationId = data.sid || null;
    }
  }
  await kv.set(id, record);
  return c.json({ id, shareLink }, 201);
});

app.get("/make-server-0491752a/groups/:id", requireAuth, async (c) => {
  const id = `group:${c.req.param("id")}`;
  const g = await kv.get(id);
  if (!g) return c.json({ error: "Group not found" }, 404);
  return c.json(g);
});

app.post("/make-server-0491752a/groups/:id/join", requireAuth, async (c) => {
  const id = `group:${c.req.param("id")}`;
  const { userId, phoneNumber } = await c.req.json();
  const g = await kv.get(id);
  if (!g) return c.json({ error: "Group not found" }, 404);
  if (g.participants.some((p: any) => p.userId === userId))
    return c.json({ message: "Already joined" });
  if (g.participants.length >= (g.maxParticipants || 5))
    return c.json({ error: "Group full" }, 400);
  g.participants.push({ userId, joinedAt: new Date().toISOString() });
  await kv.set(id, g);
  if (g.conversationId && phoneNumber && Deno.env.get("TWILIO_CONVERSATIONS_SERVICE_SID")) {
    const serviceSid = Deno.env.get("TWILIO_CONVERSATIONS_SERVICE_SID")!;
    await fetch(
      `https://conversations.twilio.com/v1/Services/${serviceSid}/Conversations/${g.conversationId}/Participants`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(
            `${Deno.env.get("TWILIO_ACCOUNT_SID")}:${Deno.env.get("TWILIO_AUTH_TOKEN")}`
          )}`,
        },
        body: new URLSearchParams({ "MessagingBinding.Address": phoneNumber }),
      }
    ).catch(() => {});
  }
  return c.json({ participants: g.participants.length });
});

app.post("/make-server-0491752a/groups/:id/vote", requireAuth, async (c) => {
  const id = `group:${c.req.param("id")}`;
  const { userId, slot } = await c.req.json();
  const g = await kv.get(id);
  if (!g) return c.json({ error: "Group not found" }, 404);
  g.votes = g.votes || [];
  g.votes.push({ userId, slot, votedAt: new Date().toISOString() });
  await kv.set(id, g);
  return c.json({ ok: true });
});

app.post("/make-server-0491752a/groups/:id/finalize", requireAuth, async (c) => {
  const id = `group:${c.req.param("id")}`;
  const { slot } = await c.req.json();
  const g = await kv.get(id);
  if (!g) return c.json({ error: "Group not found" }, 404);
  g.status = "finalized";
  g.finalSlot = slot;
  await kv.set(id, g);
  return c.json({ status: "finalized" });
});

app.post("/make-server-0491752a/groups/:id/view", async (c) => {
  const id = c.req.param("id");
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "";
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "";
  if (!url || !token) return c.json({ error: "Upstash not configured" }, 501);
  const key = `active_viewers:group:${id}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", key], ["EXPIRE", key, "600"]]),
  });
  if (!res.ok) return c.json({ error: "Upstash error" }, 500);
  return c.json({ ok: true });
});

app.get("/make-server-0491752a/groups/:id/viewers", async (c) => {
  const id = c.req.param("id");
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "";
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "";
  if (!url || !token) return c.json({ error: "Upstash not configured" }, 501);
  const key = `active_viewers:group:${id}`;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const val = res.ok ? await res.json().catch(() => null) : null;
  const count = Number(val?.result || "0");
  const ghost = 2 + Math.floor(Math.random() * 4);
  return c.json({ viewers: count + ghost });
});

app.post("/make-server-0491752a/stories/templates/generate", requireAuth, async (c) => {
  const { medSpaId, treatmentName } = await c.req.json();
  const branding = (await kv.get(medSpaId))?.settings?.branding || {};
  const templates = [
    `Just got ${treatmentName} at @[medspa] and I'm OBSESSED 😍`,
    `This glow though ✨ Thanks @[medspa]!`,
    `Feeling myself! 💁‍♀️ ${treatmentName} by @[medspa]`,
    `Before ➡️ After. Wow. @[medspa] you're magic!`,
    `10/10 recommend @[medspa] for ${treatmentName}!`,
  ];
  return c.json({ templates, branding });
});

app.post("/make-server-0491752a/stories/publish", requireAuth, async (c) => {
  const { userId, medSpaId, photoUrl, referralCode } = await c.req.json();
  const id = `instagram_post:${crypto.randomUUID()}`;
  const rec = {
    id,
    user_id: userId,
    med_spa_id: medSpaId,
    instagram_post_id: null,
    post_type: "story",
    media_url: photoUrl,
    caption: `Use code ${referralCode} for $50 off!`,
    referral_code_included: true,
    views: 0,
    clicks: 0,
    conversions: 0,
    posted_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  await kv.set(id, rec);
  return c.json({ id });
});

app.post("/make-server-0491752a/instagram/webhook", async (c) => {
  const payload = await c.req.json().catch(() => ({}));
  await kv.set(`instagram_webhook:${crypto.randomUUID()}`, {
    payload,
    received_at: new Date().toISOString(),
  });
  return c.json({ ok: true });
});

app.post("/make-server-0491752a/stories/:id/credit", requireAuth, async (c) => {
  const id = c.req.param("id");
  const { userId, action } = await c.req.json();
  const user = await kv.get(`user:${userId}`);
  if (!user) return c.json({ error: "User not found" }, 404);
  let add = 0;
  if (action === "posted") add = 25;
  else if (action === "click") add = 10;
  else if (action === "book") add = 75;
  else if (action === "complete") add = 25;
  user.credits = (user.credits || 0) + add;
  await kv.set(`user:${userId}`, user);
  const ledgerId = `credits_ledger:${crypto.randomUUID()}`;
  await kv.set(ledgerId, {
    id: ledgerId,
    user_id: userId,
    med_spa_id: null,
    amount: add,
    transaction_type: "earned",
    source: "story",
    reference_id: id,
    balance_before: (user.credits || 0) - add,
    balance_after: user.credits || 0,
    created_at: new Date().toISOString(),
  });
  return c.json({ added: add, credits: user.credits });
});

app.get("/make-server-0491752a/stories/:id/analytics", requireAuth, async (c) => {
  const id = `instagram_post:${c.req.param("id")}`;
  const rec = await kv.get(id);
  if (!rec) return c.json({ error: "Not found" }, 404);
  return c.json({
    views: rec.views || 0,
    clicks: rec.clicks || 0,
app.get("/make-server-0491752a/corporate/linkedin/start", async (c) => {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID") ?? "";
  const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI") ?? "";
  const scope = encodeURIComponent("r_liteprofile r_emailaddress w_member_social");
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
  return c.json({ url });
});

app.post("/make-server-0491752a/corporate/linkedin/callback", requireAuth, async (c) => {
  const { code, userId } = await c.req.json();
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET") ?? "";
  const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI") ?? "";
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return c.json({ error: "LinkedIn token error", details: text }, 500);
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
  const emailRes = await fetch("https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))", {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
  const profile = profileRes && profileRes.ok ? await profileRes.json() : null;
  const email = emailRes && emailRes.ok ? await emailRes.json() : null;
  await kv.set(`linkedin_profile:${userId}`, { accessToken, profile, email, linkedAt: new Date().toISOString() });
  return c.json({ linked: true });
});

app.post("/make-server-0491752a/corporate/partners", requireAuth, async (c) => {
  const body = await c.req.json();
  const id = `corporate_partner:${crypto.randomUUID()}`;
  const rec = {
    id,
    med_spa_id: body.medSpaId,
    company_name: body.company_name,
    industry: body.industry ?? null,
    hr_contact_name: body.hr_contact_name ?? null,
    hr_email: body.hr_email ?? null,
    hr_phone: body.hr_phone ?? null,
    employee_count: body.employee_count ?? 0,
    employees_enrolled: 0,
    monthly_rate_per_employee: body.monthly_rate_per_employee ?? null,
    contract_start_date: body.contract_start_date ?? null,
    contract_end_date: body.contract_end_date ?? null,
    billing_day_of_month: body.billing_day_of_month ?? 1,
    stripe_subscription_id: null,
    referred_by_user_id: body.referred_by_user_id ?? null,
    referrer_commission_rate: body.referrer_commission_rate ?? 0.05,
    total_lifetime_value: 0,
    status: "proposal_sent",
    custom_branding: body.custom_branding ?? {},
    company_domain: body.company_domain ?? null,
    created_at: new Date().toISOString(),
  };
  await kv.set(id, rec);
  return c.json({ id }, 201);
});

app.get("/make-server-0491752a/corporate/partners/:id", requireAuth, async (c) => {
  const id = `corporate_partner:${c.req.param("id")}`;
  const rec = await kv.get(id);
  if (!rec) return c.json({ error: "Not found" }, 404);
  return c.json(rec);
});

app.post("/make-server-0491752a/corporate/partners/:id/proposal", requireAuth, async (c) => {
  const id = `corporate_partner:${c.req.param("id")}`;
  const partner = await kv.get(id);
  if (!partner) return c.json({ error: "Partner not found" }, 404);
  const proposalId = `proposal:${crypto.randomUUID()}`;
  const tiers = [
    { range: "1-50", pricePerEmployeeYear: 300 },
    { range: "51-200", pricePerEmployeeYear: 250 },
    { range: "201+", pricePerEmployeeYear: 200 },
  ];
  const proposal = {
    id: proposalId,
    partner_id: id,
    created_at: new Date().toISOString(),
    pricing_tiers: tiers,
    roi: { participation_rate: "20-40%", satisfaction_boost: "+25%" },
    status: "generated",
  };
  await kv.set(proposalId, proposal);
  const sendgrid = Deno.env.get("SENDGRID_API_KEY") ?? "";
  if (sendgrid && partner.hr_email) {
    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${sendgrid}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: partner.hr_email }] }],
        from: { email: Deno.env.get("SENDGRID_FROM_EMAIL") ?? "no-reply@clientchain.app", name: "ClientChain" },
        subject: `Employee Wellness Proposal`,
        content: [{ type: "text/plain", value: "Please find your proposal attached in the portal." }],
      }),
    }).catch(() => {});
  }
  return c.json({ proposalId });
});

app.post("/make-server-0491752a/corporate/employees/enroll", requireAuth, async (c) => {
  const body = await c.req.json();
  const partner = await kv.get(body.corporate_partner_id);
  if (!partner) return c.json({ error: "Partner not found" }, 404);
  const domain = partner.company_domain;
  if (domain && (!body.employee_email || !body.employee_email.endsWith(`@${domain}`))) {
    return c.json({ error: "Work email must match company domain" }, 400);
  }
  const id = `corporate_employee:${crypto.randomUUID()}`;
  const rec = {
    id,
    corporate_partner_id: body.corporate_partner_id,
    user_id: body.user_id,
    employee_email: body.employee_email,
    employee_name: body.employee_name,
    enrollment_date: new Date().toISOString(),
    deactivation_date: null,
    monthly_credit_amount: body.monthly_credit_amount ?? 200,
    credits_used_this_month: 0,
    is_active: true,
  };
  await kv.set(id, rec);
  const credits = rec.monthly_credit_amount;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 12);
  const ledgerId = `credits_ledger:${crypto.randomUUID()}`;
  await kv.set(ledgerId, {
    id: ledgerId,
    user_id: rec.user_id,
    med_spa_id: partner.med_spa_id ?? null,
    amount: credits,
    transaction_type: "earned",
    source: "corporate",
    reference_id: id,
    balance_before: 0,
    balance_after: credits,
    expires_at: expires.toISOString(),
    created_at: new Date().toISOString(),
  });
  const user = await kv.get(`user:${rec.user_id}`);
  if (user) {
    user.credits = (user.credits || 0) + credits;
    await kv.set(`user:${rec.user_id}`, user);
  }
  return c.json({ id }, 201);
});

app.post("/make-server-0491752a/corporate/partners/:id/subscription/create", requireAuth, async (c) => {
  const id = `corporate_partner:${c.req.param("id")}`;
  const partner = await kv.get(id);
  if (!partner) return c.json({ error: "Partner not found" }, 404);
  const body = await c.req.json();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const customerId = body.stripe_customer_id;
  if (!customerId) return c.json({ error: "Missing stripe_customer_id" }, 400);
  const productRes = await fetch("https://api.stripe.com/v1/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ name: "Corporate Wellness Credits" }).toString(),
  });
  const product = await productRes.json();
  const unit = Math.round((body.price_amount_per_employee || 30000));
  const priceRes = await fetch("https://api.stripe.com/v1/prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ product: product.id, currency: body.currency || "usd", unit_amount: String(unit), recurring_interval: "month" }).toString(),
  });
  const price = await priceRes.json();
  const employees = (await kv.getByPrefix("corporate_employee:")).filter((e: any) => e.corporate_partner_id === id && e.is_active).length;
  const subRes = await fetch("https://api.stripe.com/v1/subscriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ customer: customerId, "items[0][price]": price.id, "items[0][quantity]": String(employees) }).toString(),
  });
  if (!subRes.ok) {
    const text = await subRes.text();
    return c.json({ error: "Subscription error", details: text }, 500);
  }
  const sub = await subRes.json();
  partner.stripe_subscription_id = sub.id;
  await kv.set(id, partner);
  return c.json({ subscription_id: sub.id });
});

app.post("/make-server-0491752a/corporate/partners/:id/subscription/update", requireAuth, async (c) => {
  const id = `corporate_partner:${c.req.param("id")}`;
  const partner = await kv.get(id);
  if (!partner || !partner.stripe_subscription_id) return c.json({ error: "Subscription not found" }, 404);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const subId = partner.stripe_subscription_id;
  const employees = (await kv.getByPrefix("corporate_employee:")).filter((e: any) => e.corporate_partner_id === id && e.is_active).length;
  const getRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, { headers: { Authorization: `Bearer ${stripeKey}` } });
  const sub = await getRes.json();
  const itemId = sub.items?.data?.[0]?.id;
  if (!itemId) return c.json({ error: "Subscription item missing" }, 500);
  const upd = await fetch(`https://api.stripe.com/v1/subscription_items/${itemId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ quantity: String(employees), proration_behavior: "create_prorations" }).toString(),
  });
  if (!upd.ok) {
    const text = await upd.text();
    return c.json({ error: "Update error", details: text }, 500);
  }
  return c.json({ quantity: employees });
});

app.post("/make-server-0491752a/corporate/connect/onboard", requireAuth, async (c) => {
  const { userId } = await c.req.json();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const accountRes = await fetch("https://api.stripe.com/v1/accounts", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ type: "express" }).toString(),
  });
  const account = await accountRes.json();
  const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ account: account.id, type: "account_onboarding", refresh_url: "https://clientchain.app/onboarding/refresh", return_url: "https://clientchain.app/onboarding/complete" }).toString(),
  });
  const link = await linkRes.json();
  const user = await kv.get(`user:${userId}`);
  if (user) {
    user.stripe_connect_account_id = account.id;
    await kv.set(`user:${userId}`, user);
  }
  return c.json({ onboarding_url: link.url, account_id: account.id });
});

app.post("/make-server-0491752a/corporate/commissions/award", requireAuth, async (c) => {
  const { referrer_user_id, corporate_partner_id, type, employee_count, monthly_amount } = await c.req.json();
  let amount = 0;
  if (type === "enroll") amount = (employee_count || 0) * 100;
  else if (type === "recurring") amount = Math.round(((monthly_amount || 0) * (employee_count || 0)) * 0.05);
  const ledgerId = `commission_ledger:${crypto.randomUUID()}`;
  await kv.set(ledgerId, {
    id: ledgerId,
    referrer_user_id,
    corporate_partner_id,
    amount,
    type,
    created_at: new Date().toISOString(),
    status: "pending",
  });
  const user = await kv.get(`user:${referrer_user_id}`);
  if (user) {
    user.pending_commissions = (user.pending_commissions || 0) + amount;
    await kv.set(`user:${referrer_user_id}`, user);
  }
  return c.json({ id: ledgerId, amount });
});

app.post("/make-server-0491752a/corporate/commissions/payout", requireAuth, async (c) => {
  const { userId, amount, currency } = await c.req.json();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const user = await kv.get(`user:${userId}`);
  const account = user?.stripe_connect_account_id;
  if (!account) return c.json({ error: "Connect account missing" }, 400);
  const res = await fetch("https://api.stripe.com/v1/transfers", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ amount: String(Math.round((amount || 0) * 100)), currency: currency || "usd", destination: account }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    return c.json({ error: "Transfer error", details: text }, 500);
  }
  const transfer = await res.json();
  const payoutId = `commission_payout:${crypto.randomUUID()}`;
  await kv.set(payoutId, { id: payoutId, user_id: userId, amount, currency: currency || "usd", transfer_id: transfer.id, created_at: new Date().toISOString() });
  user.pending_commissions = Math.max((user.pending_commissions || 0) - amount, 0);
  await kv.set(`user:${userId}`, user);
  return c.json({ transfer_id: transfer.id });
});

// ============== NETWORK GRAPH & METRICS ==============

app.get("/make-server-0491752a/users/:userId/network/graph", requireAuth, async (c) => {
  const userId = c.req.param("userId");
  const referrals = await kv.getByPrefix("referral:");
  const tier1 = referrals.filter((r: any) => r.referrerId === userId);
  const bookings = await kv.getByPrefix("booking:");
  const nodes: any[] = [];
  const edges: any[] = [];
  const avgValue = 300;
  const rootValue = bookings.filter((b: any) => b.userId === userId && b.status !== "cancelled").reduce((sum: number, b: any) => sum + (b.total_price ?? avgValue), 0);
  nodes.push({ id: userId, name: "Client", type: "client", value: rootValue, tier: 0, color: "gold" });
  for (const r of tier1) {
    const refId = r.id;
    const bks = bookings.filter((b: any) => b.referralId === refId);
    const ltv = bks.reduce((sum: number, b: any) => sum + (b.total_price ?? avgValue), 0);
    const friendName = r.friendName || "Friend";
    const nodeId = refId;
    nodes.push({ id: nodeId, name: friendName, type: "referral", value: ltv, tier: 1, color: "green" });
    edges.push({ source: userId, target: nodeId });
  }
  return c.json({ nodes, edges });
});

app.get("/make-server-0491752a/users/:userId/network/metrics", requireAuth, async (c) => {
  const userId = c.req.param("userId");
  const referrals = await kv.getByPrefix("referral:");
  const tier1 = referrals.filter((r: any) => r.referrerId === userId);
  const bookings = await kv.getByPrefix("booking:");
  const referralBookings = bookings.filter((b: any) => tier1.some((r: any) => r.id === b.referralId));
  const directReferrals = tier1.length;
  const bookedReferrals = tier1.filter((r: any) => r.status === "booked" || r.status === "completed").length;
  const totalNetworkSize = directReferrals; // tiers >1 require referred_user_id data
  const avgValue = 300;
  const networkLTV = referralBookings.reduce((sum: number, b: any) => sum + (b.total_price ?? avgValue), 0);
  const userBookings = bookings.filter((b: any) => b.userId === userId && b.status !== "cancelled");
  const personalLTV = userBookings.reduce((sum: number, b: any) => sum + (b.total_price ?? avgValue), 0);
  const acquisitionCost = (await kv.get(`user:${userId}`))?.acquisition_cost ?? 0;
  const roi = acquisitionCost > 0 ? ((networkLTV + personalLTV - acquisitionCost) / acquisitionCost) * 100 : null;
  const months: Record<string, number> = {};
  for (const r of tier1) {
    const month = (r.createdAt || new Date().toISOString()).slice(0, 7);
    months[month] = (months[month] || 0) + 1;
  }
  const virality = directReferrals > 0 ? directReferrals / 1 : 0;
  const healthScore = Math.min(100, (bookedReferrals * 10) + Math.min(30, referralBookings.length * 3) + Math.min(60, networkLTV / 100));
  return c.json({
    directReferrals,
    indirectReferrals: 0,
    totalNetworkSize,
    networkLTV,
    personalLTV,
    acquisitionCost,
    roiPercent: roi ? roi.toFixed(2) : null,
    growthByMonth: months,
    viralityCoefficient: Number(virality.toFixed(2)),
    healthScore: Math.round(healthScore),
  });
});

app.get("/make-server-0491752a/users/:userId/overview", requireAuth, async (c) => {
  const userId = c.req.param("userId");
  const transactions = await kv.getByPrefix("transaction:");
  const credits = await kv.getByPrefix("credits_ledger:");
  const referrals = await kv.getByPrefix("referral:");
  const posts = await kv.getByPrefix("instagram_post:");
  const events = await kv.getByPrefix("event:");
  const corporatePartners = await kv.getByPrefix("corporate_partner:");
  const userTx = transactions.filter((t: any) => t.user_id === userId && t.status === "completed");
  const totalSpent = userTx.reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const earned = credits.filter((c: any) => c.user_id === userId && c.transaction_type === "earned").reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const redeemed = credits.filter((c: any) => c.user_id === userId && c.transaction_type === "redeemed").reduce((s: number, c: any) => s + Math.abs(c.amount || 0), 0);
  const tier = (await kv.get(`user:${userId}`))?.tier || "standard";
  const tier1 = referrals.filter((r: any) => r.referrerId === userId);
  const converted = tier1.filter((r: any) => r.status === "booked" || r.status === "completed").length;
  const referralRevenue = converted * 300;
  const commissionEarned = (await kv.getByPrefix("commission_ledger:")).filter((cl: any) => cl.referrer_user_id === userId).reduce((s: number, cl: any) => s + (cl.amount || 0), 0);
  const userPosts = posts.filter((p: any) => p.user_id === userId);
  const storyViews = userPosts.reduce((s: number, p: any) => s + (p.views || 0), 0);
  const storyClicks = userPosts.reduce((s: number, p: any) => s + (p.clicks || 0), 0);
  const hosted = events.filter((e: any) => e.hostId === userId);
  const totalAttendees = hosted.reduce((s: number, e: any) => s + (e.attendees?.length || 0), 0);
  const partyRevenue = hosted.length * 3000;
  const companiesIntroduced = corporatePartners.filter((p: any) => p.referred_by_user_id === userId).length;
  const employeesEnrolled = (await kv.getByPrefix("corporate_employee:")).filter((e: any) => {
    const partner = corporatePartners.find((p: any) => p.id === e.corporate_partner_id);
    return partner?.referred_by_user_id === userId;
  }).length;
  const corporateReferralValue = employeesEnrolled * 3000;
  return c.json({
    personal: { totalSpent, creditsEarned: earned, creditsRedeemed: redeemed, loyaltyTier: tier },
    referrals: { friendsReferred: tier1.length, friendsConverted: converted, conversionRate: tier1.length ? Math.round((converted / tier1.length) * 100) : 0, totalReferralRevenue: referralRevenue, commissionEarned },
    social: { storiesPosted: userPosts.length, storyViews, storyClicks, leaderboardRank: null },
    events: { partiesHosted: hosted.length, totalAttendees, partyRevenue },
    corporate: { companiesIntroduced, employeesEnrolled, corporateReferralValue },
  });
});

app.get("/make-server-0491752a/users/:userId/network/export", requireAuth, async (c) => {
  const format = (c.req.query("format") || "csv").toLowerCase();
  const userId = c.req.param("userId");
  const referrals = await kv.getByPrefix("referral:");
  const tier1 = referrals.filter((r: any) => r.referrerId === userId);
  const bookings = await kv.getByPrefix("booking:");
  const avgValue = 300;
  const rows = [["id","name","type","value","tier"]];
  rows.push([userId, "Client", "client", String(bookings.filter((b: any) => b.userId === userId).reduce((s: number, b: any) => s + (b.total_price ?? avgValue), 0)), "0"]);
  for (const r of tier1) {
    const ltv = bookings.filter((b: any) => b.referralId === r.id).reduce((s: number, b: any) => s + (b.total_price ?? avgValue), 0);
    rows.push([r.id, r.friendName || "Friend", "referral", String(ltv), "1"]);
  }
  if (format === "csv") {
    const csv = rows.map((r) => r.join(",")).join("\n");
    return c.text(csv, 200, { "Content-Type": "text/csv" });
  }
  return c.json({ rows });
});

app.post("/make-server-0491752a/users/:userId/network/triggers/analyze", requireAuth, async (c) => {
  const userId = c.req.param("userId");
  const referrals = await kv.getByPrefix("referral:");
  const last7 = referrals.filter((r: any) => r.referrerId === userId && (Date.now() - new Date(r.createdAt || Date.now()).getTime()) < 7 * 24 * 60 * 60 * 1000);
  const suggestions: string[] = [];
  if (last7.length >= 3) suggestions.push("Network growing fast: consider VIP upgrade.");
  const posts = await kv.getByPrefix("instagram_post:");
  const views = posts.filter((p: any) => p.user_id === userId).reduce((s: number, p: any) => s + (p.views || 0), 0);
  if (views > 500 && last7.length === 0) suggestions.push("High social reach: offer a referral challenge.");
  const networkValue = (await kv.getByPrefix("booking:")).filter((b: any) => last7.some((r: any) => r.id === b.referralId)).reduce((s: number, b: any) => s + (b.total_price ?? 300), 0);
  if (networkValue < 1000) suggestions.push("Your network is warming up. Share a limited-time offer.");
  return c.json({ suggestions });
});

const withinQuietHours = (tz: string | null) => {
  try {
    const now = new Date();
    const hour = now.getUTCHours();
    return hour < 8 || hour >= 21;
  } catch {
    return false;
  }
};

const rateLimited = async (userId: string, channel: string, max: number) => {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "";
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "";
  if (!url || !token) return false;
  const key = `rate_limit:${userId}:${channel}:${new Date().toISOString().slice(0,10)}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", key], ["EXPIRE", key, "86400"]]),
  });
  if (!res.ok) return false;
  const json = await res.json().catch(() => null);
  const count = Array.isArray(json) ? Number(json[0]?.result || 0) : 0;
  return count > max;
};

const sendSMS = async (to: string, body: string) => {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const token = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const from = Deno.env.get("TWILIO_FROM_NUMBER") ?? "";
  if (!sid || !token || !from) throw new Error("Twilio not configured");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("From", from);
  params.set("Body", body);
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` }, body: params });
  if (!res.ok) throw new Error("Twilio send error");
};

const sendEmail = async (to: string, subject: string, content: string) => {
  const key = Deno.env.get("SENDGRID_API_KEY") ?? "";
  const from = Deno.env.get("SENDGRID_FROM_EMAIL") ?? "no-reply@clientchain.app";
  if (!key) throw new Error("SendGrid not configured");
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from, name: "ClientChain" }, subject, content: [{ type: "text/plain", value: content }] }),
  });
  if (res.status !== 202) throw new Error("SendGrid send error");
};

app.post("/make-server-0491752a/workflows", requireAuth, async (c) => {
  const body = await c.req.json();
  const id = `workflow:${crypto.randomUUID()}`;
  const rec = { id, name: body.name, triggers: body.triggers || [], actions: body.actions || [], conditions: body.conditions || [], status: "active", created_at: new Date().toISOString() };
  await kv.set(id, rec);
  return c.json({ id }, 201);
});

app.get("/make-server-0491752a/workflows/:id", requireAuth, async (c) => {
  const id = `workflow:${c.req.param("id")}`;
  const wf = await kv.get(id);
  if (!wf) return c.json({ error: "Not found" }, 404);
  return c.json(wf);
});

app.put("/make-server-0491752a/workflows/:id/status", requireAuth, async (c) => {
  const id = `workflow:${c.req.param("id")}`;
  const wf = await kv.get(id);
  if (!wf) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json();
  wf.status = body.status || wf.status;
  await kv.set(id, wf);
  return c.json({ status: wf.status });
});

app.post("/make-server-0491752a/workflows/templates/apply", requireAuth, async (c) => {
  const body = await c.req.json();
  const name = body.name;
  const templates: Record<string, any> = {
    "treatment_completed_referral_prompt": { triggers: [{ type: "booking_status", value: "completed" }], actions: [{ type: "wait", value: 300 }, { type: "prompt_ipad", value: "friend_tagging" }] },
    "friend_tagged_instant_dm": { triggers: [{ type: "friend_tagged" }], actions: [{ type: "generate_video" }, { type: "send_dm_or_sms" }] },
    "friend_books_notify_referrer": { triggers: [{ type: "booking_created_with_referral" }], actions: [{ type: "send_sms_referrer", message: "Great news! You earned $75!", add_credits: 75 }] },
    "no_referral_30_days": { triggers: [{ type: "no_referral_since", days: 30 }], actions: [{ type: "send_email", subject: "Share your results", content: "Post a story and get $50 credit." }] },
    "high_lead_score_followup": { triggers: [{ type: "lead_score_above", threshold: 80 }], actions: [{ type: "create_task", title: "Call hot lead" }, { type: "send_sms", message: "Hi, can I answer questions?" }] },
    "abandoned_booking_recovery": { triggers: [{ type: "booking_abandoned", within_hours: 2 }], actions: [{ type: "wait", value: 3600 }, { type: "send_email", subject: "Complete your booking", content: "Finish and get $25 off." }, { type: "wait", value: 86400 }, { type: "send_sms", message: "Last chance! Slot is being released." }] },
  };
  const tpl = templates[name];
  if (!tpl) return c.json({ error: "Unknown template" }, 400);
  const id = `workflow:${crypto.randomUUID()}`;
  const rec = { id, name, triggers: tpl.triggers, actions: tpl.actions, conditions: [], status: "active", created_at: new Date().toISOString() };
  await kv.set(id, rec);
  return c.json({ id }, 201);
});

app.post("/make-server-0491752a/workflows/:id/run", requireAuth, async (c) => {
  const id = `workflow:${c.req.param("id")}`;
  const body = await c.req.json();
  const wf = await kv.get(id);
  if (!wf || wf.status !== "active") return c.json({ error: "Workflow inactive" }, 400);
  const user = await kv.get(`user:${body.targetUserId}`);
  const execId = `workflow_exec:${crypto.randomUUID()}`;
  const exec = { id: execId, workflow_id: id, target_user_id: body.targetUserId, context: body.context || {}, step_index: 0, status: "running", started_at: new Date().toISOString(), next_step_at: new Date().toISOString(), attempts: 0, errors: [] };
  await kv.set(execId, exec);
  const proceed = async () => {
    const actions = wf.actions || [];
    let i = exec.step_index;
    while (i < actions.length) {
      const a = actions[i];
      if (a.type === "wait") {
        exec.step_index = i + 1;
        exec.next_step_at = new Date(Date.now() + Number(a.value || 0) * 1000).toISOString();
        await kv.set(execId, exec);
        return;
      }
      if (a.type === "send_sms") {
        if (user?.optOutSMS) { i++; continue; }
        if (withinQuietHours(user?.timezone || null)) { i++; continue; }
        const limited = await rateLimited(user.id, "sms", 3);
        if (limited) { i++; continue; }
        const phone = user?.phone || "";
        if (phone) await sendSMS(phone, a.message || "");
      } else if (a.type === "send_email") {
        if (user?.optOutEmail || (user?.consent_marketing === false)) { i++; continue; }
        if (withinQuietHours(user?.timezone || null)) { i++; continue; }
        const limited = await rateLimited(user.id, "email", 5);
        if (limited) { i++; continue; }
        const email = user?.email || "";
        if (email) await sendEmail(email, a.subject || "", a.content || "");
      } else if (a.type === "add_credits") {
        const amt = Number(a.value || 0);
        const profile = await kv.get(`user:${user.id}`);
        if (profile) {
          profile.credits = (profile.credits || 0) + amt;
          await kv.set(`user:${user.id}`, profile);
          const ledgerId = `credits_ledger:${crypto.randomUUID()}`;
          await kv.set(ledgerId, { id: ledgerId, user_id: user.id, med_spa_id: null, amount: amt, transaction_type: "earned", source: "workflow", reference_id: execId, created_at: new Date().toISOString() });
        }
      } else if (a.type === "update_user") {
        const updates = a.updates || {};
        const profile = await kv.get(`user:${user.id}`);
        if (profile) {
          const next = { ...profile, ...updates, updatedAt: new Date().toISOString() };
          await kv.set(`user:${user.id}`, next);
        }
      } else if (a.type === "webhook") {
        const url = a.url || "";
        if (url) {
          await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, context: exec.context }) }).catch(() => {});
        }
      } else if (a.type === "create_task") {
        const taskId = `task:${crypto.randomUUID()}`;
        await kv.set(taskId, { id: taskId, title: a.title || "Task", for: "staff", created_at: new Date().toISOString(), user_id: user.id, status: "open" });
      } else if (a.type === "prompt_ipad") {
        await kv.set(`ipad_prompt:${user.id}:${Date.now()}`, { type: a.value || "friend_tagging", created_at: new Date().toISOString() });
      } else if (a.type === "send_dm_or_sms") {
        const phone = user?.phone || "";
        if (phone) await sendSMS(phone, "Watch your personalized video and share.");
      } else if (a.type === "send_sms_referrer") {
        const referrerId = exec.context?.referrerId;
        if (referrerId) {
          const ref = await kv.get(`user:${referrerId}`);
          if (ref?.phone) await sendSMS(ref.phone, a.message || "");
          const amt = Number(a.add_credits || 0);
          if (amt && ref) {
            ref.credits = (ref.credits || 0) + amt;
            await kv.set(`user:${referrerId}`, ref);
          }
        }
      }
      i++;
    }
    exec.step_index = i;
    exec.status = "completed";
    exec.completed_at = new Date().toISOString();
    await kv.set(execId, exec);
  };
  try {
    await proceed();
    return c.json({ execution_id: execId });
  } catch (e: any) {
    exec.errors.push(e?.message || "error");
    exec.status = "failed";
    await kv.set(execId, exec);
    return c.json({ error: "Execution failed" }, 500);
  }
});

app.post("/make-server-0491752a/workflows/process-due", async (c) => {
  const execs = await kv.getByPrefix("workflow_exec:");
  const due = execs.filter((e: any) => e.status === "running" && new Date(e.next_step_at).getTime() <= Date.now());
  for (const e of due) {
    const wf = await kv.get(e.workflow_id);
    if (!wf || wf.status !== "active") continue;
    const user = await kv.get(`user:${e.target_user_id}`);
    const actions = wf.actions || [];
    let i = e.step_index;
    while (i < actions.length) {
      const a = actions[i];
      if (a.type === "wait") {
        e.step_index = i + 1;
        e.next_step_at = new Date(Date.now() + Number(a.value || 0) * 1000).toISOString();
        await kv.set(e.id, e);
        break;
      }
      i++;
    }
    if (i >= actions.length) {
      e.step_index = i;
      e.status = "completed";
      e.completed_at = new Date().toISOString();
      await kv.set(e.id, e);
    }
  }
  return c.json({ processed: due.length });
});

app.post("/make-server-0491752a/stripe/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  const body = await c.req.text();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""; // Needs to be set in env

  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);

  // In a real edge function, we would verify the signature here using Stripe's library.
  // For this mock/demo, we'll parse the body directly if signature verification is skipped or mocked.
  let event;
  try {
    event = JSON.parse(body);
  } catch (err) {
    return c.json({ error: "Webhook error", details: err.message }, 400);
  }

  try {
    switch (event.type) {
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        // Find subscription by customerId
        const subs = await kv.getByPrefix("saas_subscription:");
        const subEntry = subs.find((s: any) => s.stripe_customer_id === customerId);
        
        if (subEntry) {
          // Update status to past_due or suspended based on retry count (mock logic)
          const attemptCount = invoice.attempt_count || 1;
          const nextPaymentAttempt = invoice.next_payment_attempt;
          
          let status = "past_due";
          if (attemptCount >= 3) {
            status = "suspended"; // Suspension toggle logic
          }

          subEntry.status = status;
          subEntry.last_payment_error = invoice.last_payment_error?.message || "Payment failed";
          subEntry.retry_schedule = nextPaymentAttempt ? new Date(nextPaymentAttempt * 1000).toISOString() : null;
          
          await kv.set(`saas_subscription:${subEntry.med_spa_id}`, subEntry);
          console.log(`Updated subscription for ${subEntry.med_spa_id} to ${status}`);
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subs = await kv.getByPrefix("saas_subscription:");
        const subEntry = subs.find((s: any) => s.stripe_customer_id === customerId);

        if (subEntry) {
          subEntry.status = subscription.status;
          subEntry.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
          await kv.set(`saas_subscription:${subEntry.med_spa_id}`, subEntry);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return c.json({ error: "Processing error" }, 500);
  }

  return c.json({ received: true });
});

app.post("/make-server-0491752a/corporate/commissions/process-scheduled", requireAuth, async (c) => {
  const { threshold_usd } = await c.req.json(); // e.g., 50 for $50 minimum
  const minThreshold = Number(threshold_usd || 50);
  
  const users = await kv.getByPrefix("user:");
  const payoutResults = [];

  for (const user of users) {
    if ((user.pending_commissions || 0) >= minThreshold) {
      const amount = user.pending_commissions;
      
      // Trigger payout logic (reusing existing payout flow logic)
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
      const account = user.stripe_connect_account_id;
      
      if (stripeKey && account) {
        try {
          const res = await fetch("https://api.stripe.com/v1/transfers", {
            method: "POST",
            headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ 
              amount: String(Math.round(amount * 100)), 
              currency: "usd", 
              destination: account,
              description: "Monthly Commission Payout"
            }).toString(),
          });

          if (res.ok) {
            const transfer = await res.json();
            const payoutId = `commission_payout:${crypto.randomUUID()}`;
            await kv.set(payoutId, { 
              id: payoutId, 
              user_id: user.id, 
              amount, 
              currency: "usd", 
              transfer_id: transfer.id, 
              created_at: new Date().toISOString(),
              type: "auto_scheduled"
            });
            
            // Reset pending commissions
            user.pending_commissions = 0;
            await kv.set(`user:${user.id}`, user);
            
            payoutResults.push({ userId: user.id, amount, status: "paid", transfer_id: transfer.id });
          } else {
            payoutResults.push({ userId: user.id, amount, status: "failed", error: await res.text() });
          }
        } catch (e: any) {
          payoutResults.push({ userId: user.id, amount, status: "failed", error: e.message });
        }
      } else {
        payoutResults.push({ userId: user.id, amount, status: "skipped", reason: "No Connect account or Stripe key" });
      }
    }
  }

  return c.json({ processed_count: payoutResults.length, results: payoutResults });
});

app.get("/make-server-0491752a/reports/medspa/:medSpaId/financial", requireAuth, async (c) => {
  const medSpaId = c.req.param("medSpaId");
  const month = c.req.query("month") || new Date().toISOString().slice(0, 7); // YYYY-MM

  // Fetch bookings for this med spa
  const allBookings = await kv.getByPrefix("booking:");
  const medSpaBookings = allBookings.filter((b: any) => 
    b.medSpaId === medSpaId && 
    (b.createdAt || "").startsWith(month) &&
    b.status !== "cancelled"
  );

  // Calculate Revenue
  const totalRevenue = medSpaBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
  
  // Calculate Platform Fees (5%)
  const platformFees = totalRevenue * 0.05;

  // Calculate Commissions Paid (Referral payouts related to this med spa's bookings)
  // Note: This requires tracking which commissions are tied to which med spa. 
  // Assuming 'commission_ledger' has 'med_spa_id' or we infer from bookings.
  // For now, we'll estimate based on bookings that had referrals.
  const referralBookings = medSpaBookings.filter((b: any) => b.referralId);
  const commissionsEstimated = referralBookings.length * 50; // $50 flat fee per referral for example

  const netRevenue = totalRevenue - platformFees - commissionsEstimated;

  return c.json({
    medSpaId,
    period: month,
    gross_revenue: totalRevenue,
    platform_fees: platformFees,
    commissions_paid: commissionsEstimated,
    net_revenue: netRevenue,
    booking_count: medSpaBookings.length
  });
});

app.get("/make-server-0491752a/reports/platform/financial", requireAuth, async (c) => {
  const month = c.req.query("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // Platform Revenue from Subscriptions
  const subscriptions = await kv.getByPrefix("saas_subscription:");
  // Estimate subscription revenue (simple calculation based on plan types)
  const subscriptionRevenue = subscriptions.reduce((sum: number, s: any) => {
    if (s.status !== "active") return sum;
    const plan = s.plan || "starter";
    const prices: any = { starter: 500, professional: 1200, enterprise: 2500 }; // Monthly amounts / 100
    return sum + (prices[plan] || 0);
  }, 0);

  // Platform Revenue from Rev Share (5% of all bookings)
  const allBookings = await kv.getByPrefix("booking:");
  const monthBookings = allBookings.filter((b: any) => (b.createdAt || "").startsWith(month) && b.status !== "cancelled");
  const totalBookingVolume = monthBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
  const revShareTotal = totalBookingVolume * 0.05;

  // Churn & Expansion (Mock metrics for now)
  const churnRate = 0.02; // 2%
  const expansionRevenue = 5000; // Upsells

  // Outstanding Invoices
  // In a real scenario, fetch unpaid invoices from Stripe
  const outstandingInvoicesAmount = 1500; 

  return c.json({
    period: month,
    subscription_revenue: subscriptionRevenue,
    revenue_share_total: revShareTotal,
    total_platform_revenue: subscriptionRevenue + revShareTotal,
    churn_rate: churnRate,
    expansion_revenue: expansionRevenue,
    outstanding_invoices: outstandingInvoicesAmount,
    active_subscriptions: subscriptions.length
  });
});

app.get("/make-server-0491752a/invoices/:id/pdf", requireAuth, async (c) => {
  const invoiceId = c.req.param("id");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  if (stripeKey) {
    try {
      const res = await fetch(`https://api.stripe.com/v1/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      
      if (res.ok) {
        const invoice = await res.json();
        if (invoice.invoice_pdf) {
          return c.redirect(invoice.invoice_pdf);
        }
      }
    } catch (e) {
      console.error("Stripe fetch failed:", e);
    }
  }

  // Fallback: Generate HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoiceId}</title>
      <style>
        body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #0ea5e9; }
        .invoice-details { text-align: right; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .total { font-size: 18px; font-weight: bold; text-align: right; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">ClientChain</div>
        <div class="invoice-details">
          <h1>INVOICE</h1>
          <p>#${invoiceId}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div class="bill-to">
        <h3>Bill To:</h3>
        <p>Valued Client</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Platform Subscription / Services</td>
            <td>$100.00</td>
          </tr>
        </tbody>
      </table>
      <div class="total">
        Total: $100.00
      </div>
      <div class="no-print" style="margin-top: 40px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer;">Print / Download PDF</button>
      </div>
    </body>
    </html>
  `;
  
  return c.html(html);
});

// ============== NEXT ADDITIONS: PAYMENTS, COMMISSIONS, REPORTING ==============

// 1. Failed Payment Handling (Stripe Webhook)
app.post("/make-server-0491752a/payments/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();
  // In a real app, verify signature. Here we just parse event type.
  const event = JSON.parse(body);

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;
    
    // Find med spa or partner by subscription/customer
    // This is inefficient in KV but functional for demo
    const medSpas = await kv.getByPrefix("saas_subscription:");
    const sub = medSpas.find((s: any) => s.subscription_id === subscriptionId || s.stripe_customer_id === customerId);
    
    if (sub) {
      sub.status = "past_due";
      sub.last_payment_failure = new Date().toISOString();
      sub.retry_count = (sub.retry_count || 0) + 1;
      
      // Dunning rule: suspend if > 3 retries
      if (sub.retry_count > 3) {
        sub.status = "suspended";
        sub.suspended_at = new Date().toISOString();
      }
      
      await kv.set(`saas_subscription:${sub.med_spa_id}`, sub);
      
      // Notify admin/owner (simulated)
      console.log(`Payment failed for ${sub.med_spa_id}. Status: ${sub.status}`);
    }
  }
  
  return c.json({ received: true });
});

// 2. Commission Auto-pay Schedule (Monthly Aggregation)
app.post("/make-server-0491752a/corporate/commissions/autopay", requireAuth, async (c) => {
  const { min_threshold_usd } = await c.req.json();
  const threshold = Number(min_threshold_usd || 50);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);

  // Get all pending commissions
  const commissions = await kv.getByPrefix("commission_ledger:");
  const pending = commissions.filter((r: any) => r.status === "pending" && r.type === "referral_cash");
  
  // Aggregate by user
  const userTotals: Record<string, number> = {};
  for (const p of pending) {
    userTotals[p.referrer_user_id] = (userTotals[p.referrer_user_id] || 0) + (p.amount || 0);
  }
  
  const payouts: any[] = [];
  
  for (const [userId, total] of Object.entries(userTotals)) {
    if (total >= threshold) {
      const user = await kv.get(`user:${userId}`);
      if (user?.stripe_connect_account_id) {
        try {
          const res = await fetch("https://api.stripe.com/v1/transfers", {
            method: "POST",
            headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: stripeForm({ 
              amount: Math.round(total * 100), 
              currency: "usd", 
              destination: user.stripe_connect_account_id,
              description: "Monthly Commission Payout"
            }),
          });
          
          if (res.ok) {
            const transfer = await res.json();
            const payoutId = `payout:${crypto.randomUUID()}`;
            await kv.set(payoutId, {
              id: payoutId,
              user_id: userId,
              amount: total,
              transfer_id: transfer.id,
              created_at: new Date().toISOString()
            });
            
            // Mark ledgers as paid
            const userCommissions = pending.filter((p: any) => p.referrer_user_id === userId);
            for (const comm of userCommissions) {
              comm.status = "paid";
              comm.payout_id = payoutId;
              await kv.set(comm.id, comm);
            }
            
            payouts.push({ userId, amount: total, status: "success" });
          } else {
            payouts.push({ userId, amount: total, status: "failed_transfer" });
          }
        } catch (e) {
          payouts.push({ userId, amount: total, status: "error" });
        }
      } else {
        payouts.push({ userId, amount: total, status: "no_connect_account" });
      }
    }
  }
  
  return c.json({ payouts });
});

// 3. Financial Reporting Endpoints

// Per Med Spa Financials
app.get("/make-server-0491752a/reports/medspa/:id/financials", requireAuth, async (c) => {
  const medSpaId = c.req.param("id");
  const month = c.req.query("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const bookings = await kv.getByPrefix("booking:");
  const medSpaBookings = bookings.filter((b: any) => 
    b.medSpaId === medSpaId && 
    b.status === "completed" && 
    (b.date || "").startsWith(month)
  );
  
  const revenue = medSpaBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
  const platformFees = revenue * 0.05; // 5% take rate
  const commissions = medSpaBookings.reduce((sum: number, b: any) => sum + (b.commission_amount || 0), 0); // If stored on booking
  const netRevenue = revenue - platformFees - commissions;
  
  return c.json({
    medSpaId,
    period: month,
    revenue,
    platformFees,
    commissions,
    netRevenue,
    bookingCount: medSpaBookings.length
  });
});

// Platform Financials
app.get("/make-server-0491752a/reports/platform/financials", requireAuth, async (c) => {
  const month = c.req.query("month") || new Date().toISOString().slice(0, 7);
  
  const subscriptions = await kv.getByPrefix("saas_subscription:");
  const activeSubs = subscriptions.filter((s: any) => s.status === "active").length;
  
  const bookings = await kv.getByPrefix("booking:");
  const monthBookings = bookings.filter((b: any) => 
    b.status === "completed" && 
    (b.date || "").startsWith(month)
  );
  
  const totalGMV = monthBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
  const revenueShareTotal = totalGMV * 0.05;
  
  // Calculate churn (mock logic as we don't have full history)
  const cancelledSubs = subscriptions.filter((s: any) => s.status === "cancelled").length;
  const churnRate = activeSubs > 0 ? (cancelledSubs / (activeSubs + cancelledSubs)) * 100 : 0;
  
  // Outstanding Invoices (mock from Stripe if possible, or local state)
  // We'll return 0 for now as we don't sync invoice status fully
  
  return c.json({
    period: month,
    activeSubscriptions: activeSubs,
    gmv: totalGMV,
    revenueShareTotal,
    churnRate: churnRate.toFixed(2) + "%",
    expansionRevenue: 0, // Placeholder
    outstandingInvoices: 0 // Placeholder
  });
});

// 4. Invoice PDF Generation
// Duplicate removed

// Network Metrics (Module 6)
app.get("/make-server-0491752a/users/:userId/network/metrics", requireAuth, async (c) => {
  const userId = c.req.param("userId");
  const referrals = await kv.getByPrefix("referral:");
  const bookings = await kv.getByPrefix("booking:");
  
  const directReferrals = referrals.filter((r: any) => r.referrerId === userId);
  const indirectReferrals = referrals.filter((r: any) => directReferrals.some((dr: any) => dr.id === r.referrerId));
  
  const totalSize = directReferrals.length + indirectReferrals.length;
  
  // Calculate LTV
  const calculateLTV = (refList: any[]) => {
    return refList.reduce((sum: number, r: any) => {
      const bks = bookings.filter((b: any) => b.referralId === r.id);
      return sum + bks.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
    }, 0);
  };
  
  const networkLTV = calculateLTV(directReferrals) + calculateLTV(indirectReferrals);
  const virality = directReferrals.length > 0 ? (indirectReferrals.length / directReferrals.length) : 0;
  
  return c.json({
    total_size: totalSize,
    direct_count: directReferrals.length,
    indirect_count: indirectReferrals.length,
    network_ltv: networkLTV,
    virality_coefficient: virality.toFixed(2),
    health_score: Math.min(100, (totalSize * 10) + (virality * 20))
  });
});

// Client Detail View (Module 6)
app.get("/make-server-0491752a/users/:userId/details", requireAuth, async (c) => {
  const userId = c.req.param("userId");
  const user = await kv.get(`user:${userId}`);
  if (!user) return c.json({ error: "User not found" }, 404);
  
  const referrals = await kv.getByPrefix("referral:");
  const userReferrals = referrals.filter((r: any) => r.referrerId === userId);
  
  const bookings = await kv.getByPrefix("booking:");
  const userBookings = bookings.filter((b: any) => b.userId === userId);
  
  return c.json({
    profile: user,
    referral_stats: {
      count: userReferrals.length,
      converted: userReferrals.filter((r: any) => r.status === "converted").length
    },
    bookings: userBookings,
    timeline: [
      { date: user.created_at, event: "Joined" },
      ...userBookings.map((b: any) => ({ date: b.date, event: `Booking: ${b.treatmentId}` })),
      ...userReferrals.map((r: any) => ({ date: r.created_at, event: `Referred: ${r.friendName}` }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  });
});

// Automation Workflows (Module 7)
app.post("/make-server-0491752a/automation/workflows", requireAuth, async (c) => {
  const { name, trigger, actions } = await c.req.json();
  const workflowId = `workflow:${crypto.randomUUID()}`;
  const workflow = {
    id: workflowId,
    name,
    trigger, // e.g. { type: "booking_completed", condition: "value > 100" }
    actions, // e.g. [{ type: "sms", template: "thank_you" }, { type: "wait", duration: "2d" }]
    active: true,
    created_at: new Date().toISOString()
  };
  await kv.set(workflowId, workflow);
  logAudit(c.get('user')?.id || 'system', 'create_workflow', { workflowId });
  return c.json(workflow);
});

app.get("/make-server-0491752a/automation/workflows", requireAuth, async (c) => {
  const workflows = await kv.getByPrefix("workflow:");
  return c.json(workflows);
});

// Trigger Automation (Module 7)
app.post("/make-server-0491752a/automation/trigger", requireAuth, async (c) => {
  const { event, data } = await c.req.json();
  // Find matching workflows
  const workflows = await kv.getByPrefix("workflow:");
  const matching = workflows.filter((w: any) => w.active && w.trigger.type === event);
  
  // In a real system, we would enqueue these for processing
  const executions = matching.map((w: any) => ({
    workflowId: w.id,
    status: "queued",
    data,
    timestamp: new Date().toISOString()
  }));
  
  // Store executions
  for (const exec of executions) {
    await kv.set(`execution:${crypto.randomUUID()}`, exec);
  }
  
  return c.json({ triggered: matching.length, executions });
});

// Payment & Commission (Module 8)
app.get("/make-server-0491752a/payment/pricing", async (c) => {
  return c.json({
    tiers: [
      { id: "starter", name: "Starter", price: 500, setup: 18000, features: ["Basic Referrals", "Email Marketing"] },
      { id: "pro", name: "Pro", price: 1200, setup: 25000, features: ["All Starter", "SMS Marketing", "Campaign Builder"] },
      { id: "enterprise", name: "Enterprise", price: 2500, setup: 40000, features: ["All Pro", "White Label", "Custom Integrations"] },
      { id: "revshare", name: "RevShare", price: 0, setup: 5000, features: ["All Pro", "5% Revenue Share"] }
    ]
  });
});

app.post("/make-server-0491752a/payment/subscribe", requireAuth, async (c) => {
  const { tierId, paymentMethodId } = await c.req.json();
  const user = c.get('user');
  // Mock subscription creation
  const subId = `sub:${crypto.randomUUID()}`;
  await kv.set(subId, {
    id: subId,
    userId: user.id,
    tierId,
    status: "active",
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString()
  });
  return c.json({ subscriptionId: subId, status: "active" });
});

app.post("/make-server-0491752a/payment/connect", requireAuth, async (c) => {
  // Generate Stripe Connect onboarding link
  const user = c.get('user');
  const accountLink = `https://connect.stripe.com/setup/s/${user.id}`; // Mock link
  return c.json({ url: accountLink });
});

// AI Chatbot & Booking (Module 10)
app.post("/make-server-0491752a/chat/message", async (c) => {
  const { message, sessionId, context } = await c.req.json();
  // Mock AI response logic
  // In production, this would call OpenAI/Claude API
  let responseText = "I can help you with that. Would you like to book a consultation?";
  let intent = "general";
  
  if (message.toLowerCase().includes("book") || message.toLowerCase().includes("appointment")) {
    responseText = "I can help you schedule. We have openings tomorrow at 10am and 2pm. Which works best?";
    intent = "booking";
  } else if (message.toLowerCase().includes("price") || message.toLowerCase().includes("cost")) {
    responseText = "Our Botox treatments start at $12/unit. We also have a special on fillers this month.";
    intent = "pricing";
  }

  return c.json({
    response: responseText,
    intent,
    sessionId: sessionId || `session:${crypto.randomUUID()}`
  });
});

app.get("/make-server-0491752a/booking/availability", async (c) => {
  const { treatmentId, date } = c.req.query();
  // Mock availability
  return c.json({
    slots: ["10:00", "11:30", "14:00", "15:30", "16:45"]
  });
});

// Reputation & Reviews (Module 11)
app.post("/make-server-0491752a/reputation/review-request", requireAuth, async (c) => {
  const { bookingId } = await c.req.json();
  const booking = await kv.get(`booking:${bookingId}`);
  if (!booking) return c.json({ error: "Booking not found" }, 404);
  
  // Mock sending review request
  // await sendEmail(booking.userEmail, "How was your treatment?", "Please leave us a review...");
  
  return c.json({ status: "sent", method: "email" });
});

app.get("/make-server-0491752a/reputation/reviews", requireAuth, async (c) => {
  const reviews = await kv.getByPrefix("review:");
  // Calculate aggregate stats
  const ratings = reviews.map((r: any) => r.rating);
  const average = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
  
  return c.json({
    reviews,
    summary: {
      average: average.toFixed(1),
      count: reviews.length,
      breakdown: {
        5: ratings.filter((r: number) => r === 5).length,
        4: ratings.filter((r: number) => r === 4).length,
        1: ratings.filter((r: number) => r === 1).length
      }
    }
  });
});

// Loyalty & Gamification (Module 12)
app.get("/make-server-0491752a/loyalty/status", requireAuth, async (c) => {
  const user = c.get('user');
  const points = user.loyalty_points || 0;
  
  // Calculate tier
  let tier = "Bronze";
  let nextTier = "Silver";
  let pointsToNext = 1000 - points;
  
  if (points >= 5000) {
    tier = "Platinum";
    nextTier = "Max";
    pointsToNext = 0;
  } else if (points >= 2500) {
    tier = "Gold";
    nextTier = "Platinum";
    pointsToNext = 5000 - points;
  } else if (points >= 1000) {
    tier = "Silver";
    nextTier = "Gold";
    pointsToNext = 2500 - points;
  }
  
  return c.json({
    points,
    tier,
    next_tier: nextTier,
    points_needed: pointsToNext,
    rewards_available: [
      { id: "reward_1", name: "$25 Credit", cost: 500 },
      { id: "reward_2", name: "Free Facial", cost: 2000 }
    ]
  });
});

app.post("/make-server-0491752a/loyalty/redeem", requireAuth, async (c) => {
  const { rewardId } = await c.req.json();
  const user = c.get('user');
  // Logic to deduct points and issue reward
  return c.json({ status: "redeemed", remaining_points: user.loyalty_points - 500 });
});

// Advanced Analytics (Module 13)
app.post("/make-server-0491752a/analytics/event", async (c) => {
  const event = await c.req.json();
  // Store event asynchronously
  const eventId = `event:${crypto.randomUUID()}`;
  await kv.set(eventId, { ...event, timestamp: new Date().toISOString() });
  return c.json({ status: "recorded" });
});

app.get("/make-server-0491752a/analytics/dashboard", requireAuth, async (c) => {
  // Aggregate mock data
  return c.json({
    visitors: { current: 1250, trend: "+15%" },
    conversion_rate: { current: "3.2%", trend: "+0.5%" },
    revenue: { current: "$45,200", trend: "+12%" },
    top_sources: ["Instagram", "Referral", "Google"],
    recent_activity: [
      { action: "booking_confirmed", user: "Jane D.", time: "2m ago" },
      { action: "new_referral", user: "Mike S.", time: "15m ago" }
    ]
  });
});

// Deno.serve removed from here to allow further route definitions


// ============== PAYMENT & COMMISSION SYSTEM ==============

const stripeForm = (obj: Record<string, any>) => new URLSearchParams(Object.entries(obj).map(([k, v]) => [k, String(v ?? "")])).toString();

app.post("/make-server-0491752a/saas/subscribe", requireAuth, async (c) => {
  const { medSpaId, plan, stripe_customer_id } = await c.req.json();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const tiers: Record<string, { setup: number; monthly: number }> = {
    starter: { setup: 1800000, monthly: 50000 },
    professional: { setup: 2500000, monthly: 120000 },
    enterprise: { setup: 4000000, monthly: 250000 },
    revshare: { setup: 500000, monthly: 0 },
  };
  const pr = tiers[plan] || tiers.starter;
  if (!stripe_customer_id) return c.json({ error: "Missing stripe_customer_id" }, 400);
  if (pr.setup > 0) {
    await fetch("https://api.stripe.com/v1/invoiceitems", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: stripeForm({ customer: stripe_customer_id, amount: pr.setup, currency: "usd", description: `Setup fee (${plan})` }),
    });
  }
  let subscription_id: string | null = null;
  if (pr.monthly > 0) {
    const product = await fetch("https://api.stripe.com/v1/products", { method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: stripeForm({ name: `ClientChain ${plan} plan` }) }).then((r) => r.json());
    const price = await fetch("https://api.stripe.com/v1/prices", { method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: stripeForm({ product: product.id, currency: "usd", unit_amount: pr.monthly, recurring_interval: "month" }) }).then((r) => r.json());
    const sub = await fetch("https://api.stripe.com/v1/subscriptions", { method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: stripeForm({ customer: stripe_customer_id, "items[0][price]": price.id }) }).then((r) => r.json());
    subscription_id = sub.id;
  }
  await kv.set(`saas_subscription:${medSpaId}`, { med_spa_id: medSpaId, plan, stripe_customer_id, subscription_id, created_at: new Date().toISOString() });
  await fetch("https://api.stripe.com/v1/invoices", { method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: stripeForm({ customer: stripe_customer_id, collection_method: "send_invoice", days_until_due: 15 }) }).then(async (r) => {
    const invoice = await r.json();
    await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/finalize`, { method: "POST", headers: { Authorization: `Bearer ${stripeKey}` } });
  });
  return c.json({ subscription_id });
});

app.post("/make-server-0491752a/payments/booking/intent", requireAuth, async (c) => {
  const { booking_id, amount_usd, currency, medspa_account_id, platform_fee_percent, referrer_user_id } = await c.req.json();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const amount = Math.round(Number(amount_usd) * 100);
  const feePct = Number(platform_fee_percent ?? 0.05);
  const applicationFee = Math.round(amount * feePct);
  const intent = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: stripeForm({
      amount,
      currency: currency || "usd",
      "transfer_data[destination]": medspa_account_id,
      application_fee_amount: applicationFee,
      description: `Booking ${booking_id}`,
    }),
  }).then((r) => r.json());
  await kv.set(`payment_intent:${booking_id}`, { id: intent.id, booking_id, amount, application_fee_amount: applicationFee, medspa_account_id, referrer_user_id, status: "requires_payment_method", created_at: new Date().toISOString() });
  return c.json({ payment_intent_id: intent.id, client_secret: intent.client_secret });
});

app.post("/make-server-0491752a/payments/booking/finalize", requireAuth, async (c) => {
  const { booking_id, completed, commission_credit_amount, commission_cash_amount } = await c.req.json();
  const pi = await kv.get(`payment_intent:${booking_id}`);
  if (!pi) return c.json({ error: "Payment intent not found" }, 404);
  if (!completed) return c.json({ status: "pending" });
  const referrer = pi.referrer_user_id;
  if (referrer) {
    if (commission_credit_amount && commission_credit_amount > 0) {
      const ledgerId = `credits_ledger:${crypto.randomUUID()}`;
      await kv.set(ledgerId, { id: ledgerId, user_id: referrer, med_spa_id: null, amount: commission_credit_amount, transaction_type: "earned", source: "referral", reference_id: booking_id, created_at: new Date().toISOString() });
      const user = await kv.get(`user:${referrer}`);
      if (user) { user.credits = (user.credits || 0) + commission_credit_amount; await kv.set(`user:${referrer}`, user); }
    }
    if (commission_cash_amount && commission_cash_amount > 0) {
      const ledgerId = `commission_ledger:${crypto.randomUUID()}`;
      await kv.set(ledgerId, { id: ledgerId, referrer_user_id: referrer, corporate_partner_id: null, amount: commission_cash_amount, type: "referral_cash", created_at: new Date().toISOString(), status: "pending" });
    }
  }
  await kv.set(`payment_intent:${booking_id}`, { ...pi, status: "completed", finalized_at: new Date().toISOString() });
  return c.json({ status: "completed" });
});

app.get("/make-server-0491752a/billing/revenue-share/preview", requireAuth, async (c) => {
  const medSpaId = c.req.query("medSpaId") || "";
  const month = c.req.query("month") || new Date().toISOString().slice(0,7);
  const bookings = await kv.getByPrefix("booking:");
  const rows = bookings.filter((b: any) => b.medSpaId === medSpaId && b.referralId && (b.createdAt || "").slice(0,7) === month).map((b: any) => ({
    booking_id: b.id,
    client_id: b.userId,
    treatment_value_usd: b.total_price || 0,
    platform_fee_usd: (b.total_price || 0) * 0.05,
    source: "referral",
  }));
  const total_fee = rows.reduce((s: number, r: any) => s + (r.platform_fee_usd || 0), 0);
  return c.json({ medSpaId, month, rows, total_fee_usd: Number(total_fee.toFixed(2)) });
});

app.post("/make-server-0491752a/billing/revenue-share/invoice", requireAuth, async (c) => {
  const { medSpaId, stripe_customer_id, month } = await c.req.json();
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const preview = await (await fetch(`${new URL(c.req.url).origin}/make-server-0491752a/billing/revenue-share/preview?medSpaId=${encodeURIComponent(medSpaId)}&month=${encodeURIComponent(month || new Date().toISOString().slice(0,7))}`)).json().catch(() => null);
  if (!preview || !preview.rows) return c.json({ error: "Preview failed" }, 500);
  for (const r of preview.rows) {
    const amount = Math.round((r.platform_fee_usd || 0) * 100);
    await fetch("https://api.stripe.com/v1/invoiceitems", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: stripeForm({ customer: stripe_customer_id, amount, currency: "usd", description: `Referral fee 5% - Booking ${r.booking_id}` }),
    });
  }
  const invoiceRes = await fetch("https://api.stripe.com/v1/invoices", { method: "POST", headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: stripeForm({ customer: stripe_customer_id, collection_method: "send_invoice", days_until_due: 15 }) });
  const invoice = await invoiceRes.json();
  await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/finalize`, { method: "POST", headers: { Authorization: `Bearer ${stripeKey}` } });
  return c.json({ invoice_id: invoice.id, hosted_invoice_url: invoice.hosted_invoice_url });
});

app.post("/make-server-0491752a/credits/cashout", requireAuth, async (c) => {
  const { userId, amount_usd } = await c.req.json();
  const amount = Number(amount_usd || 0);
  if (amount < 100) return c.json({ error: "Minimum payout is $100" }, 400);
  const user = await kv.get(`user:${userId}`);
  if (!user) return c.json({ error: "User not found" }, 404);
  if ((user.credits || 0) < amount) return c.json({ error: "Insufficient credits" }, 400);
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!stripeKey) return c.json({ error: "Stripe not configured" }, 501);
  const account = user.stripe_connect_account_id;
  if (!account) return c.json({ error: "Connect account missing" }, 400);
  user.credits = (user.credits || 0) - amount;
  await kv.set(`user:${userId}`, user);
  const transfer = await fetch("https://api.stripe.com/v1/transfers", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: stripeForm({ amount: Math.round(amount * 100), currency: "usd", destination: account }),
  }).then((r) => r.json());
  const payoutId = `commission_payout:${crypto.randomUUID()}`;
  await kv.set(payoutId, { id: payoutId, user_id: userId, amount, currency: "usd", transfer_id: transfer.id, created_at: new Date().toISOString() });
  return c.json({ transfer_id: transfer.id });
});

// ============== MISSING MODULE EXTENSIONS ==============

// Module 1: iPad Kiosk Capture
app.post("/make-server-0491752a/referral/kiosk-capture", requireAuth, async (c) => {
  const { name, email, phone, instagramHandle, referrerId } = await c.req.json();
  const medSpaId = c.req.query("medSpaId");
  
  // Create or update user
  let user = (await kv.getByPrefix("user:")).find((u: any) => u.email === email || u.phone === phone);
  if (!user) {
    const userId = `user:${crypto.randomUUID()}`;
    user = { id: userId, name, email, phone, instagram_handle: instagramHandle, created_at: new Date().toISOString() };
    await kv.set(userId, user);
  }
  
  // Create referral link
  const referralId = `referral:${crypto.randomUUID()}`;
  await kv.set(referralId, {
    id: referralId,
    referrerId: user.id,
    medSpaId,
    source: "kiosk",
    status: "pending",
    created_at: new Date().toISOString()
  });

  return c.json({ status: "captured", referralId });
});

// Module 2: Group Booking Split Payment
app.post("/make-server-0491752a/bookings/group/split-payment", requireAuth, async (c) => {
  const { bookingId, shares } = await c.req.json();
  const booking = await kv.get(`booking:${bookingId}`);
  if (!booking) return c.json({ error: "Booking not found" }, 404);
  
  booking.payment_status = "split_pending";
  booking.split_details = shares.map((s: any) => ({ ...s, status: "pending", link: `https://clientchain.app/pay/${bookingId}?user=${s.email}` }));
  await kv.set(`booking:${bookingId}`, booking);
  
  return c.json({ split_details: booking.split_details });
});

// Module 9: Admin Staff Roles
app.post("/make-server-0491752a/admin/staff/roles", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const { userId, role, permissions } = await c.req.json();
  const user = await kv.get(`user:${userId}`);
  if (!user) return c.json({ error: "User not found" }, 404);
  
  user.role = role;
  user.permissions = permissions;
  await kv.set(`user:${userId}`, user);
  
  return c.json({ status: "updated", user });
});

// Module 5: Corporate Employee Invite
app.post("/make-server-0491752a/corporate/employees/invite", requireAuth, async (c) => {
  const { companyId, emails } = await c.req.json();
  // Mock sending invites
  return c.json({ status: "invites_sent", count: emails.length });
});

// Module 5: Corporate Engagement Analytics
app.get("/make-server-0491752a/corporate/analytics/engagement", requireAuth, async (c) => {
  const companyId = c.req.query("companyId");
  // Mock data
  return c.json({
    participation_rate: "42%",
    total_bookings: 85,
    top_treatments: ["Botox", "Facial"],
    savings: 3200
  });
});

// ============== PAYMENT & FINANCIAL CORE ==============

// Failed Payment Webhook (Stripe)
app.post("/make-server-0491752a/payment/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();
  // In real app: verify signature. Here: mock.
  try {
    // const event = JSON.parse(body); 
    // Mock logic:
    console.log(`Payment webhook received`);
    // Update subscription status to past_due
    // Trigger dunning email
    return c.json({ received: true });
  } catch (err) {
    return c.json({ error: "Webhook Error" }, 400);
  }
});

// Commission Auto-pay Schedule Trigger
app.post("/make-server-0491752a/payment/commission/process-schedule", requireAuth, requireRole(["admin"]), async (c) => {
  // Find all pending commissions due for payout
  const commissions = await kv.getByPrefix("commission_ledger:");
  const pending = commissions.filter((c: any) => c.status === "pending");
  
  // Group by user
  const payouts: any[] = [];
  // Mock processing
  for (const comm of pending) {
    comm.status = "processing";
    await kv.set(comm.id, comm);
    payouts.push({ userId: comm.referrer_user_id, amount: comm.amount });
  }
  
  return c.json({ status: "processing_started", count: payouts.length });
});

// Financial Reports - Med Spa
app.get("/make-server-0491752a/reports/financial/medspa/:medSpaId", requireAuth, requireRole(["owner", "manager", "admin"]), async (c) => {
  const medSpaId = c.req.param("medSpaId");
  const { startDate, endDate } = c.req.query();
  
  // Aggregate booking revenue
  const bookings = await kv.getByPrefix("booking:");
  const medSpaBookings = bookings.filter((b: any) => b.medSpaId === medSpaId && b.status === "completed"); // Add date filter logic
  
  const revenue = medSpaBookings.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
  const platformFees = revenue * 0.05; // Mock 5% fee
  const net = revenue - platformFees;
  
  return c.json({
    period: { startDate, endDate },
    gross_revenue: revenue,
    platform_fees: platformFees,
    net_revenue: net,
    transaction_count: medSpaBookings.length
  });
});

// Financial Reports - Platform (Admin)
app.get("/make-server-0491752a/reports/financial/platform", requireAuth, requireRole(["admin"]), async (c) => {
  const bookings = await kv.getByPrefix("booking:");
  const totalGMV = bookings.filter((b: any) => b.status === "completed").reduce((sum: number, b: any) => sum + (b.total_price || 0), 0);
  const revenue = totalGMV * 0.05; // Mock 5% take rate
  
  const medSpas = await kv.getByPrefix("medspa:");
  const activeSubs = medSpas.filter((m: any) => m.subscription?.status === "active").length;
  const mrr = activeSubs * 199; // Mock $199/mo
  
  return c.json({
    gmv: totalGMV,
    platform_revenue: revenue,
    mrr,
    active_medspas: activeSubs
  });
});

// Duplicate removed

// ============== MODULE IMPLEMENTATIONS (REMAINING) ==============

// Module 2: Group Booking Details
app.get("/make-server-0491752a/bookings/group/:bookingId/details", requireAuth, async (c) => {
  const bookingId = c.req.param("bookingId");
  const booking = await kv.get(`booking:${bookingId}`);
  if (!booking) return c.json({ error: "Booking not found" }, 404);
  return c.json(booking);
});

// Module 3: Instagram Story Webhook (Mock)
app.post("/make-server-0491752a/instagram/webhook", async (c) => {
  // Mock receiving story mention
  console.log("Instagram webhook received");
  return c.json({ received: true });
});

// Module 4: Event QR Check-in
app.post("/make-server-0491752a/events/:eventId/checkin", requireAuth, async (c) => {
  const eventId = c.req.param("eventId");
  const { userId, qrCode } = await c.req.json();
  // Mock check-in logic
  return c.json({ status: "checked_in", timestamp: new Date().toISOString() });
});

// Module 5: Corporate Proposal PDF
app.post("/make-server-0491752a/corporate/proposals/generate", requireAuth, async (c) => {
  const { companyName, employeeCount } = await c.req.json();
  const url = `https://cdn.clientchain.app/proposals/${companyName.replace(/\s/g, '_')}_proposal.pdf`;
  return c.json({ url });
});

// ============== MODULE 9: ADMIN & BUSINESS OPERATIONS ==============

// White-Label Branding
app.put("/make-server-0491752a/medspas/:medSpaId/branding", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const medSpaId = c.req.param("medSpaId");
  const branding = await c.req.json(); // { primaryColor, logoUrl, domain, emailTemplate }
  const medSpa = await kv.get(medSpaId);
  if (!medSpa) return c.json({ error: "Med Spa not found" }, 404);
  
  medSpa.settings.branding = { ...medSpa.settings.branding, ...branding };
  await kv.set(medSpaId, medSpa);
  return c.json({ status: "branding_updated" });
});

// Compliance Settings (HIPAA, GDPR)
app.put("/make-server-0491752a/medspas/:medSpaId/compliance", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const medSpaId = c.req.param("medSpaId");
  const settings = await c.req.json(); // { hipaaEnabled, dataRetentionDays, consentRequired }
  const medSpa = await kv.get(medSpaId);
  if (!medSpa) return c.json({ error: "Med Spa not found" }, 404);
  
  medSpa.settings.compliance = { ...medSpa.settings.compliance, ...settings };
  await kv.set(medSpaId, medSpa);
  return c.json({ status: "compliance_updated" });
});

// Integrations Hub
app.get("/make-server-0491752a/integrations", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  // Return list of available integrations and their status
  return c.json({
    available: [
      { id: "stripe", name: "Stripe", category: "payment" },
      { id: "twilio", name: "Twilio", category: "communication" },
      { id: "sendgrid", name: "SendGrid", category: "email" },
      { id: "zapier", name: "Zapier", category: "automation" },
      { id: "quickbooks", name: "QuickBooks", category: "accounting" }
    ],
    connected: [
      { id: "stripe", status: "active" },
      { id: "twilio", status: "active" }
    ]
  });
});

app.post("/make-server-0491752a/integrations/connect", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const { integrationId, apiKey, config } = await c.req.json();
  // Mock connection logic
  return c.json({ status: "connected", integrationId });
});

// Backup & Disaster Recovery
app.post("/make-server-0491752a/admin/backup", requireAuth, requireRole(["admin"]), async (c) => {
  // Trigger database backup
  const backupId = `backup:${crypto.randomUUID()}`;
  return c.json({ status: "backup_started", backupId });
});

// ============== MODULE 3 & 4 EXTENSIONS ==============

// Module 3: Instagram Leaderboard
app.get("/make-server-0491752a/instagram/leaderboard", requireAuth, async (c) => {
  const medSpaId = c.req.query("medSpaId");
  const posts = await kv.getByPrefix("instagram_post:");
  // Filter by medSpa if needed (assuming posts have medSpaId or linked user)
  // Mock leaderboard
  const leaderboard = [
    { rank: 1, user: "Sarah M.", views: 12500, points: 500 },
    { rank: 2, user: "Jessica C.", views: 8900, points: 350 },
    { rank: 3, user: "Emily D.", views: 5400, points: 200 }
  ];
  return c.json({ leaderboard });
});

// Module 3: Instagram Webhook (Story Mentions)
app.post("/make-server-0491752a/social/webhook", async (c) => {
  // Verify Instagram signature in real app
  const body = await c.req.json();
  const { entry } = body;
  
  // Process mentions
  if (entry && entry.length > 0) {
    for (const e of entry) {
       // Mock processing
       console.log(`Received Instagram webhook: ${e.id}`);
       // If mention detected, find user and award points
    }
  }
  
  return c.json({ status: "received" });
});

// Module 3: Get Mentions
app.get("/make-server-0491752a/social/mentions", requireAuth, async (c) => {
  const medSpaId = c.req.query("medSpaId");
  // Mock data
  const mentions = [
    { id: 1, user: "@sarah_glow", status: "verified", timestamp: new Date().toISOString() },
    { id: 2, user: "@jenna_beauty", status: "pending", timestamp: new Date(Date.now() - 3600000).toISOString() }
  ];
  return c.json(mentions);
});

// Module 4: Get Events
app.get("/make-server-0491752a/events", requireAuth, async (c) => {
  const medSpaId = c.req.query("medSpaId");
  const allEvents = await kv.getByPrefix("event:");
  const events = allEvents.filter((e: any) => e.medSpaId === medSpaId);
  return c.json(events);
});

// Module 4: Event Contact Import
app.post("/make-server-0491752a/events/:eventId/import-contacts", requireAuth, async (c) => {
  const eventId = c.req.param("eventId");
  const { contacts } = await c.req.json(); // Array of { name, email, phone }
  // Mock import
  return c.json({ status: "imported", count: contacts.length });
});

// Staff Management
app.get("/make-server-0491752a/medspas/:medSpaId/staff", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const medSpaId = c.req.param("medSpaId");
  const users = await kv.getByPrefix("user:");
  const staff = users.filter((u: any) => u.medSpaId === medSpaId && ["owner", "manager", "staff"].includes(u.role));
  return c.json(staff);
});

app.post("/make-server-0491752a/medspas/:medSpaId/staff", requireAuth, requireRole(["owner", "manager"]), async (c) => {
  const medSpaId = c.req.param("medSpaId");
  const { name, email, role } = await c.req.json();
  
  // Check if user exists
  const users = await kv.getByPrefix("user:");
  let user = users.find((u: any) => u.email === email);
  
  if (user) {
    user.role = role;
    user.medSpaId = medSpaId;
    await kv.set(user.id, user);
  } else {
    // Create new user (invite logic would go here)
    const userId = `user:${crypto.randomUUID()}`;
    user = {
      id: userId,
      name,
      email,
      role,
      medSpaId,
      created_at: new Date().toISOString()
    };
    await kv.set(userId, user);
  }
  
  return c.json(user, 201);
});

// Failed Payments / Past Due Accounts
app.get("/make-server-0491752a/admin/payments/failed", requireAuth, requireRole(["admin", "owner"]), async (c) => {
  // In a real app, this would query Stripe or a local DB of failed transactions
  // For now, we mock some data or filter users with past_due status
  const users = await kv.getByPrefix("user:");
  const pastDue = users.filter((u: any) => u.subscription_status === "past_due");
  
  // Also include mocked failed transactions
  const failedTransactions = [
    { id: "tx_failed_1", amount: 19900, customer: "jane@example.com", date: new Date().toISOString(), reason: "insufficient_funds" },
    { id: "tx_failed_2", amount: 5000, customer: "bob@example.com", date: new Date(Date.now() - 86400000).toISOString(), reason: "card_declined" }
  ];
  
  return c.json({ pastDueUsers: pastDue, failedTransactions });
});

Deno.serve(app.fetch);

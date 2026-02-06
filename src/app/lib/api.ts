// API client for ClientChain backend

import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0491752a`;

export class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

    // --- MODULE 1 EXTENSION: KIOSK ---
  async captureKioskReferral(data: { name: string; email: string; phone: string; instagramHandle?: string; referrerId?: string; medSpaId: string }) {
    const response = await fetch(`${API_BASE_URL}/referral/kiosk-capture?medSpaId=${data.medSpaId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 2 EXTENSION: SPLIT PAYMENTS ---
  async splitBookingPayment(bookingId: string, shares: { email: string; amount: number }[]) {
    const response = await fetch(`${API_BASE_URL}/bookings/group/split-payment`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ bookingId, shares }),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 5 EXTENSIONS: CORPORATE ---
  async inviteCorporateEmployees(companyId: string, emails: string[]) {
    const response = await fetch(`${API_BASE_URL}/corporate/employees/invite`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ companyId, emails }),
    });
    return this.handleResponse(response);
  }

  async getCorporateEngagement(companyId: string) {
    const response = await fetch(`${API_BASE_URL}/corporate/analytics/engagement?companyId=${companyId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async downloadInvoice(id: string) {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}/pdf`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to download invoice');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token || publicAnonKey}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error(`API Error (${response.status}):`, error);
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }
    return response.json();
  }

  // Auth
  async signup(email: string, password: string, name: string, role?: string, medSpaId?: string) {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ email, password, name, role, medSpaId }),
    });
    return this.handleResponse(response);
  }

  async signin(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  // Med Spas
  async createMedSpa(data: { name: string; address: string; phone: string; settings?: any }) {
    const response = await fetch(`${API_BASE_URL}/medspas`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getMedSpa(id: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTreatments(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/treatments`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Users
  async getUser(id: string) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateUser(id: string, updates: any) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    return this.handleResponse(response);
  }

  // Referrals
  async createReferral(data: { friendName: string; friendContact: string; method: string; campaignId?: string }) {
    const response = await fetch(`${API_BASE_URL}/referrals`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async trackClick(referralId: string) {
    const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return this.handleResponse(response);
  }

  async getUserReferrals(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/referrals`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Bookings
  async createBooking(data: { 
    userId: string; 
    medSpaId: string; 
    treatment: string; 
    date: string; 
    time: string; 
    groupSize?: number;
    referralId?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getUserBookings(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/bookings`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Campaigns
  async createCampaign(data: {
    medSpaId: string;
    name: string;
    type: string;
    discountAmount: number;
    startDate: string;
    endDate: string;
    targeting?: any;
  }) {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getMedSpaCampaigns(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/campaigns`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Events
  async createEvent(data: {
    medSpaId: string;
    name: string;
    date: string;
    time: string;
    location: string;
    maxAttendees?: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async rsvpEvent(eventId: string, data: { name: string; email: string; phone: string }) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getEvent(eventId: string) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
    });
    return this.handleResponse(response);
  }

  // Analytics
  async getUserAnalytics(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/analytics`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMedSpaAnalytics(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/analytics`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Credits
  async getUserCredits(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/credits`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async applyCredits(bookingId: string, creditsToApply: number) {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/apply-credits`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ creditsToApply }),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 6: NETWORK VALUE TRACKER ---
  async getNetworkGraph(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/network/graph`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getNetworkMetrics(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/network/metrics`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getClientDetails(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/details`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 7: AUTOMATION ENGINE ---
  async createWorkflow(data: { name: string; trigger: any; actions: any[] }) {
    const response = await fetch(`${API_BASE_URL}/automation/workflows`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getWorkflows() {
    const response = await fetch(`${API_BASE_URL}/automation/workflows`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async triggerAutomation(event: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/automation/trigger`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ event, data }),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 8: PAYMENT & COMMISSION ---
  async getPricingTiers() {
    const response = await fetch(`${API_BASE_URL}/payment/pricing`, {
      headers: { 'Content-Type': 'application/json' }, // Public endpoint
    });
    return this.handleResponse(response);
  }

  async subscribe(tierId: string, paymentMethodId: string) {
    const response = await fetch(`${API_BASE_URL}/payment/subscribe`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tierId, paymentMethodId }),
    });
    return this.handleResponse(response);
  }

  async getStripeConnectLink() {
    const response = await fetch(`${API_BASE_URL}/payment/connect`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async cashoutCredits(userId: string, amountUsd: number) {
    const response = await fetch(`${API_BASE_URL}/credits/cashout`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, amount_usd: amountUsd }),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 9: ADMIN & OPERATIONS ---
  async createLocation(data: { parent_med_spa_id: string; name: string; address: string }) {
    const response = await fetch(`${API_BASE_URL}/locations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateStaffRole(staffId: string, role: string, permissions: string[]) {
    const response = await fetch(`${API_BASE_URL}/staff/${staffId}/role`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ role, permissions }),
    });
    return this.handleResponse(response);
  }

  async getFraudAlerts() {
    const response = await fetch(`${API_BASE_URL}/fraud/alerts`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 10: AI CHATBOT ---
  async getChatbotConfig(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/chatbot/config`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateChatbotConfig(medSpaId: string, config: any) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/chatbot/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });
    return this.handleResponse(response);
  }

  // --- MISSING ADMIN METHODS ---
  // getMedSpaAnalytics and getMedSpaCampaigns are already defined above.

  async getMedSpaCorporateEngagement(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/corporate`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getRecentInvoices(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/invoices`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCorporatePartners(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/partners`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMedSpaEvents(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/events`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSocialMentions(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/mentions`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSystemStatus() {
    const response = await fetch(`${API_BASE_URL}/system/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getReferralLeaderboard(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/leaderboard`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }


  async sendChatMessage(message: string, sessionId?: string, context?: any) {
    const response = await fetch(`${API_BASE_URL}/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // Public or auth? Assuming public for lead gen
      body: JSON.stringify({ message, sessionId, context }),
    });
    return this.handleResponse(response);
  }

  // --- REPUTATION & LOYALTY ---
  async requestReview(bookingId: string) {
    const response = await fetch(`${API_BASE_URL}/reputation/review-request`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ bookingId }),
    });
    return this.handleResponse(response);
  }

  async getReviews() {
    const response = await fetch(`${API_BASE_URL}/reputation/reviews`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getLoyaltyStatus() {
    const response = await fetch(`${API_BASE_URL}/loyalty/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async redeemLoyaltyReward(rewardId: string) {
    const response = await fetch(`${API_BASE_URL}/loyalty/redeem`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ rewardId }),
    });
    return this.handleResponse(response);
  }

  // --- CORE FINANCIAL & REPORTS ---
  async triggerCommissionPayouts() {
    const response = await fetch(`${API_BASE_URL}/payment/commission/process-schedule`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMedSpaFinancialReport(medSpaId: string, startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);
    const response = await fetch(`${API_BASE_URL}/reports/financial/medspa/${medSpaId}?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getPlatformFinancialReport() {
    const response = await fetch(`${API_BASE_URL}/reports/financial/platform`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getInvoicePdf(invoiceId: string) {
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/pdf`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 2 & 4 & 5 EXTENSIONS ---
  async getGroupBookingDetails(bookingId: string) {
    const response = await fetch(`${API_BASE_URL}/bookings/group/${bookingId}/details`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async checkInEvent(eventId: string, userId: string, qrCode: string) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/checkin`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, qrCode }),
    });
    return this.handleResponse(response);
  }

  async generateCorporateProposal(companyName: string, employeeCount: number) {
    const response = await fetch(`${API_BASE_URL}/corporate/proposals/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ companyName, employeeCount }),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 9: ADMIN & OPERATIONS EXTENSIONS ---
  async updateMedSpaBranding(medSpaId: string, branding: any) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/branding`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(branding),
    });
    return this.handleResponse(response);
  }

  async updateMedSpaCompliance(medSpaId: string, settings: any) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/compliance`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    return this.handleResponse(response);
  }

  async getIntegrations() {
    const response = await fetch(`${API_BASE_URL}/integrations`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async connectIntegration(integrationId: string, apiKey: string, config?: any) {
    const response = await fetch(`${API_BASE_URL}/integrations/connect`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ integrationId, apiKey, config }),
    });
    return this.handleResponse(response);
  }

  async getStaff(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/staff`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async addStaff(medSpaId: string, data: { name: string; email: string; role: string }) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/staff`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getFailedPayments() {
    const response = await fetch(`${API_BASE_URL}/admin/payments/failed`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async triggerBackup() {
    const response = await fetch(`${API_BASE_URL}/admin/backup`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // --- MODULE 3 & 4 EXTENSIONS ---
  async getInstagramLeaderboard(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/instagram/leaderboard?medSpaId=${medSpaId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async importEventContacts(eventId: string, contacts: any[]) {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/import-contacts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ contacts }),
    });
    return this.handleResponse(response);
  }

  async getRecentInvoices(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/invoices`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCorporatePartners(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/corporate-partners`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMedSpaEvents(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/events`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSocialMentions(medSpaId: string) {
    const response = await fetch(`${API_BASE_URL}/medspas/${medSpaId}/social/mentions`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSystemStatus() {
     const response = await fetch(`${API_BASE_URL}/system/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const api = new ApiClient();

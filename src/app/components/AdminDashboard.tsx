import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/lib/auth';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  LogOut, 
  Users, 
  DollarSign, 
  TrendingUp,
  Sparkles,
  Building2,
  Calendar,
  Target,
  Plus,
  Settings,
  Workflow,
  Activity,
  CreditCard,
  Shield,
  MessageSquare
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { NetworkGraph } from './NetworkGraph';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [financialReport, setFinancialReport] = useState<any>(null);
  const [chatbotSettings, setChatbotSettings] = useState<any>(null);
  const [corporateData, setCorporateData] = useState<any>(null);
  const [networkMetrics, setNetworkMetrics] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [staff, setStaff] = useState<any[]>([]);
  const [failedPayments, setFailedPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [socialMentions, setSocialMentions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedClientId) {
      loadNetworkMetrics(selectedClientId);
    } else if (user?.id) {
       loadNetworkMetrics(user.id);
    }
  }, [selectedClientId, user]);

  const loadNetworkMetrics = async (id: string) => {
    try {
      const metrics = await api.getNetworkMetrics(id);
      setNetworkMetrics(metrics);
    } catch (error) {
      console.error('Failed to load network metrics:', error);
    }
  };
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user && user.role !== 'admin' && user.role !== 'owner' && user.role !== 'manager') {
      navigate('/dashboard');
      return;
    }

    loadAdminData();
  }, [user, authLoading, navigate]);

  const loadAdminData = async () => {
    if (!user) return;

    try {
      if (user.medSpaId) {
        const [
          analyticsData, 
          campaignsData, 
          workflowsData, 
          pricingData, 
          financialData, 
          chatbotData, 
          corpData,
          invoicesData,
          partnersData,
          eventsData,
          socialData,
          systemData,
          leaderboardData
        ] = await Promise.all([
          api.getMedSpaAnalytics(user.medSpaId),
          api.getMedSpaCampaigns(user.medSpaId),
          api.getWorkflows(),
          api.getPricingTiers(),
          api.getMedSpaFinancialReport(user.medSpaId),
          api.getChatbotConfig(user.medSpaId),
          api.getCorporateEngagement(user.medSpaId),
          api.getRecentInvoices(user.medSpaId),
          api.getCorporatePartners(user.medSpaId),
          api.getMedSpaEvents(user.medSpaId),
          api.getSocialMentions(user.medSpaId),
          api.getSystemStatus(),
          api.getReferralLeaderboard(user.medSpaId)
        ]);

        setAnalytics(analyticsData);
        setCampaigns(campaignsData as any[]);
        setWorkflows(workflowsData as any[]);
        setPricing(pricingData);
        setFinancialReport(financialData);
        setChatbotSettings(chatbotData);
        setCorporateData(corpData);
        setInvoices(invoicesData as any[]);
        setPartners(partnersData as any[]);
        setEvents(eventsData as any[]);
        setSocialMentions(socialData as any[]);
        setSystemStatus(systemData);
        setLeaderboard(leaderboardData as any[]);

        if (user.role === 'owner' || user.role === 'manager') {
          const staffData = await api.getStaff(user.medSpaId);
          setStaff(staffData);
        }
      }

      if (user.role === 'admin') {
        const failedData = await api.getFailedPayments();
        setFailedPayments(failedData);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!user?.medSpaId) return;

    try {
      await api.addStaff(user.medSpaId, {
        email: formData.get('email') as string,
        role: formData.get('role') as string,
        name: formData.get('name') as string,
      });

      toast.success('Staff member added successfully!');
      setShowStaffDialog(false);
      loadAdminData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add staff');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await api.createCampaign({
        medSpaId: user!.medSpaId!,
        name: formData.get('name') as string,
        type: formData.get('type') as string,
        discountAmount: parseFloat(formData.get('discountAmount') as string),
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
      });

      toast.success('Campaign created successfully!');
      setShowCampaignDialog(false);
      loadAdminData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create campaign');
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await api.createWorkflow({
        name: formData.get('name') as string,
        trigger: { type: formData.get('trigger') as string },
        actions: [{ type: formData.get('action') as string }],
      });

      toast.success('Workflow created successfully!');
      setShowWorkflowDialog(false);
      loadAdminData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workflow');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ClientChain
                </h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge className="bg-purple-100 text-purple-800">
                <Building2 className="w-3 h-3 mr-1" />
                {user.medSpaId ? 'Med Spa Admin' : 'Super Admin'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white p-1 rounded-xl border shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="chatbot">AI Chatbot</TabsTrigger>
            <TabsTrigger value="corporate">Corporate</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalBookings || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics?.referralBookings || 0} from referrals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.activeClients || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Unique clients served</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics?.revenue?.toLocaleString() || 0}</div>
                  <p className="text-xs text-gray-500 mt-1">Total revenue</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Referral Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-pink-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.referralRate || '0'}%</div>
                  <p className="text-xs text-gray-500 mt-1">Of total bookings</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
                <DialogTrigger asChild>
                  <Button className="h-auto py-6 flex flex-col gap-2 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <Plus className="w-6 h-6" />
                    <span>Create Campaign</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>Launch a new referral or promotional campaign.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCampaign} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Campaign Name</Label>
                      <Input id="name" name="name" placeholder="Summer Glow Referral" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <select id="type" name="type" className="w-full border rounded-md p-2">
                        <option value="referral">Referral Program</option>
                        <option value="seasonal">Seasonal Promo</option>
                        <option value="event">Event Invite</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountAmount">Discount Amount ($)</Label>
                      <Input id="discountAmount" name="discountAmount" type="number" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input id="startDate" name="startDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input id="endDate" name="endDate" type="date" required />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">Launch Campaign</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
             <div className="flex justify-between items-center">
               <h2 className="text-xl font-semibold">Automation Workflows</h2>
               <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
                 <DialogTrigger asChild>
                   <Button><Plus className="w-4 h-4 mr-2" /> New Workflow</Button>
                 </DialogTrigger>
                 <DialogContent>
                   <DialogHeader>
                     <DialogTitle>Create Automation Workflow</DialogTitle>
                   </DialogHeader>
                   <form onSubmit={handleCreateWorkflow} className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="wf-name">Workflow Name</Label>
                       <Input id="wf-name" name="name" required />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="trigger">Trigger</Label>
                       <select id="trigger" name="trigger" className="w-full border rounded-md p-2">
                         <option value="booking_completed">Booking Completed</option>
                         <option value="referral_created">Referral Created</option>
                         <option value="birthday">Client Birthday</option>
                       </select>
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="action">Action</Label>
                       <select id="action" name="action" className="w-full border rounded-md p-2">
                         <option value="sms">Send SMS</option>
                         <option value="email">Send Email</option>
                         <option value="add_credits">Add Credits</option>
                       </select>
                     </div>
                     <Button type="submit" className="w-full">Create Workflow</Button>
                   </form>
                 </DialogContent>
               </Dialog>
             </div>
             
             <div className="grid gap-4">
               {workflows.map((wf) => (
                 <Card key={wf.id}>
                   <CardContent className="p-4 flex justify-between items-center">
                     <div>
                       <h3 className="font-semibold">{wf.name}</h3>
                       <p className="text-sm text-gray-500">Trigger: {wf.trigger.type}</p>
                     </div>
                     <Badge variant={wf.active ? "default" : "secondary"}>{wf.active ? "Active" : "Paused"}</Badge>
                   </CardContent>
                 </Card>
               ))}
               {workflows.length === 0 && <p className="text-gray-500">No active workflows.</p>}
             </div>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Manage payments, payouts, and subscriptions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                    <div>
                      <h4 className="font-semibold">Stripe Connect</h4>
                      <p className="text-sm text-gray-500">Manage payouts and banking</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={async () => {
                    const res = await api.getStripeConnectLink();
                    window.open(res.url, '_blank');
                  }}>Manage Account</Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">Gross Revenue (Mo)</h4>
                    <p className="text-2xl font-bold mt-1">${financialReport?.gross_revenue?.toLocaleString() || '0.00'}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">Platform Fees</h4>
                    <p className="text-2xl font-bold mt-1 text-red-600">-${financialReport?.platform_fees?.toLocaleString() || '0.00'}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500">Net Revenue</h4>
                    <p className="text-2xl font-bold mt-1 text-green-600">${financialReport?.net_revenue?.toLocaleString() || '0.00'}</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Recent Invoices</h4>
                  <div className="space-y-2">
                    {invoices.length === 0 ? <p className="text-gray-500 text-sm">No recent invoices.</p> : invoices.map((inv) => (
                      <div key={inv.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                        <span>Invoice #{inv.number} - {new Date(inv.date).toLocaleDateString()}</span>
                        <Button variant="ghost" size="sm" onClick={() => api.downloadInvoice(inv.id)}>
                          Download PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                   <Button onClick={async () => {
                     await api.triggerCommissionPayouts();
                     toast.success("Commission payout schedule triggered");
                   }}>Trigger Payouts</Button>
                </div>
              </CardContent>
            </Card>

            {(failedPayments.length > 0 || user?.role === 'admin') && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Failed Payments</CardTitle>
                  <CardDescription>Action required for these transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {failedPayments.length === 0 ? (
                      <p className="text-sm text-gray-500">No failed payments found.</p>
                    ) : (
                      failedPayments.map((payment: any, i) => (
                        <div key={i} className="flex justify-between items-center p-4 border rounded-lg bg-red-50">
                          <div>
                            <p className="font-semibold text-red-900">{payment.customer_email || 'Unknown Customer'}</p>
                            <p className="text-sm text-red-700">Amount: ${(payment.amount / 100).toFixed(2)}</p>
                            <p className="text-xs text-red-600">Reason: {payment.last_payment_error?.message || 'Declined'}</p>
                          </div>
                          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
                            Retry
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
             {networkMetrics && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">Total Network Size</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{networkMetrics.total_network_size || 0}</div>
                     <p className="text-xs text-gray-500">Clients in network</p>
                   </CardContent>
                 </Card>
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">Direct Referrals</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{networkMetrics.direct_referrals || 0}</div>
                     <p className="text-xs text-gray-500">Level 1 connections</p>
                   </CardContent>
                 </Card>
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">Network LTV</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">${networkMetrics.network_ltv?.toLocaleString() || '0.00'}</div>
                     <p className="text-xs text-gray-500">Total value generated</p>
                   </CardContent>
                 </Card>
                 <Card>
                   <CardHeader className="pb-2">
                     <CardTitle className="text-sm font-medium text-gray-500">Virality Score</CardTitle>
                   </CardHeader>
                   <CardContent>
                     <div className="text-2xl font-bold">{networkMetrics.virality_coefficient || '0.0'}</div>
                     <p className="text-xs text-gray-500">K-factor</p>
                   </CardContent>
                 </Card>
               </div>
             )}

             <Card>
               <CardHeader>
                 <CardTitle>Client Network Graph</CardTitle>
                 <CardDescription>Visualize referral connections and network value. Enter a Client ID to view their network.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="mb-4 flex gap-4">
                    <Input 
                      placeholder="Enter Client ID" 
                      id="network-client-id" 
                      defaultValue={user?.id} 
                      onChange={(e) => setSelectedClientId(e.target.value)}
                    />
                    <Button onClick={() => {
                      // Trigger refresh if needed, or rely on state change
                      const input = document.getElementById('network-client-id') as HTMLInputElement;
                      if(input) setSelectedClientId(input.value);
                    }}>Update Graph</Button>
                 </div>
                 <NetworkGraph userId={selectedClientId || user?.id || 'demo-user'} />
               </CardContent>
             </Card>
          </TabsContent>
          
          <TabsContent value="chatbot" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Chatbot Configuration</CardTitle>
                <CardDescription>Manage your AI receptionist settings and availability.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                    <div>
                      <h4 className="font-semibold">AI Assistant Status</h4>
                      <p className="text-sm text-gray-500">
                        {chatbotSettings?.enabled ? 'Active and responding' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={chatbotSettings?.enabled ? "default" : "secondary"}
                    onClick={async () => {
                        await api.updateChatbotConfig(user!.medSpaId!, { enabled: !chatbotSettings?.enabled });
                        loadAdminData();
                    }}
                  >
                    {chatbotSettings?.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Persona</h4>
                        <Input 
                            defaultValue={chatbotSettings?.persona || "Friendly Receptionist"}
                            onBlur={async (e) => {
                                await api.updateChatbotConfig(user!.medSpaId!, { persona: e.target.value });
                            }}
                        />
                    </div>
                    <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Response Tone</h4>
                        <Input 
                            defaultValue={chatbotSettings?.tone || "Professional"}
                            onBlur={async (e) => {
                                await api.updateChatbotConfig(user!.medSpaId!, { tone: e.target.value });
                            }}
                        />
                    </div>
                </div>
                
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-semibold">Integrations Hub</h4>
                      <p className="text-sm text-gray-500">Connect with your favorite tools (Stripe, Twilio, Salesforce).</p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Manage Integrations</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Integrations Directory</DialogTitle>
                        <DialogDescription>Connect external services to streamline your workflow.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {[
                          { id: 'stripe', name: 'Stripe', desc: 'Payment processing & payouts', connected: true },
                          { id: 'twilio', name: 'Twilio', desc: 'SMS & WhatsApp notifications', connected: true },
                          { id: 'sendgrid', name: 'SendGrid', desc: 'Email marketing campaigns', connected: false },
                          { id: 'salesforce', name: 'Salesforce', desc: 'CRM synchronization', connected: false },
                          { id: 'hubspot', name: 'HubSpot', desc: 'Marketing automation', connected: false },
                          { id: 'zapier', name: 'Zapier', desc: 'Connect 5000+ apps', connected: false },
                        ].map((integration) => (
                          <div key={integration.id} className="border rounded-lg p-4 flex justify-between items-start">
                            <div>
                              <h5 className="font-medium">{integration.name}</h5>
                              <p className="text-xs text-gray-500 mt-1">{integration.desc}</p>
                            </div>
                            <Button 
                              variant={integration.connected ? "outline" : "default"} 
                              size="sm"
                              className={integration.connected ? "text-green-600 border-green-200 bg-green-50" : ""}
                            >
                              {integration.connected ? "Connected" : "Connect"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="corporate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Corporate Wellness Partners</CardTitle>
                <CardDescription>Manage B2B partnerships and employee engagement.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Total Partners</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{corporateData?.partners_count || 0}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Employees Enrolled</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{corporateData?.employees_enrolled || 0}</div></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">${corporateData?.monthly_revenue?.toLocaleString() || '0.00'}</div></CardContent>
                    </Card>
                 </div>

                 <div className="mt-6">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="font-semibold">Active Partners</h4>
                     <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Partner</Button>
                   </div>
                   {partners.length === 0 ? <p className="text-gray-500">No active corporate partners.</p> : (
                     <div className="space-y-4">
                       {partners.map(partner => (
                         <div key={partner.id} className="flex justify-between items-center p-4 border rounded-lg">
                           <div>
                             <h5 className="font-medium">{partner.company_name}</h5>
                             <p className="text-sm text-gray-500">{partner.contact_name} ({partner.contact_email})</p>
                           </div>
                           <div className="flex items-center gap-2">
                             <Badge variant="outline">{partner.employees_count || 0} Employees</Badge>
                             <Button size="sm" variant="ghost" onClick={async () => {
                               const email = prompt(`Enter employee email to invite to ${partner.company_name}:`);
                               if (email) {
                                 await api.inviteCorporateEmployees(partner.id, [email]);
                                 toast.success(`Invitation sent to ${email}`);
                               }
                             }}>Invite Employee</Button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Hosting (Botox Parties)</CardTitle>
                <CardDescription>Manage events, RSVPs, and check-ins.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button><Plus className="w-4 h-4 mr-2" /> Host Event</Button>
                </div>
                {events.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No upcoming events scheduled.</p>
                    <Button variant="link">Schedule your first Botox Party</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map(event => (
                      <div key={event.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">{event.name}</h4>
                          <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()} at {event.time}</p>
                          <p className="text-xs text-gray-400">{event.location}</p>
                        </div>
                        <Badge>{event.rsvps_count || 0} RSVPs</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card>
                 <CardHeader>
                   <CardTitle>Instagram Story Automation</CardTitle>
                   <CardDescription>Track mentions and automate rewards.</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-4">
                     {socialMentions.length === 0 ? <p className="text-gray-500">No recent mentions.</p> : socialMentions.map((mention, i) => (
                       <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                         <span className="font-medium">@{mention.username}</span>
                         <Badge className={mention.status === 'verified' ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                           {mention.status}
                         </Badge>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
               
               <Card>
                 <CardHeader>
                   <CardTitle>Referral Leaderboard</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-4">
                     {leaderboard.length === 0 ? <p className="text-gray-500">No active referrers.</p> : leaderboard.map((client, i) => (
                       <div key={client.id || i} className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600">#{i + 1}</div>
                         <div className="flex-1">
                           <p className="font-medium">{client.name || `Client ${i + 1}`}</p>
                           <p className="text-xs text-gray-500">{client.referrals_count} referrals this month</p>
                         </div>
                         <div className="text-right">
                           <p className="font-bold">{client.points} pts</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>
             </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    <div>
                      <h4 className="font-semibold">White-Label Branding</h4>
                      <p className="text-sm text-gray-500">Customize logo, colors, and domain</p>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Customize</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Branding Settings</DialogTitle>
                        <DialogDescription>Update your med spa's look and feel.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          if (!user?.medSpaId) return;
                          await api.updateMedSpaBranding(user.medSpaId, {
                              primaryColor: formData.get('primaryColor') as string,
                              logoUrl: formData.get('logoUrl') as string
                          });
                          toast.success('Branding updated!');
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <Input name="primaryColor" type="color" defaultValue="#7c3aed" className="h-10 w-20" />
                        </div>
                        <div className="space-y-2">
                          <Label>Logo URL</Label>
                          <Input name="logoUrl" placeholder="https://..." />
                        </div>
                        <Button type="submit" className="w-full">Save Changes</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">Compliance & Security</h4>
                      <p className="text-sm text-gray-500">HIPAA settings, data retention, audit logs</p>
                    </div>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Users className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="font-semibold">Staff & Permissions</h4>
                        <p className="text-sm text-gray-500">Manage roles and access levels</p>
                      </div>
                    </div>
                    <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
                      <DialogTrigger asChild>
                         <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Staff</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Staff Member</DialogTitle>
                          <DialogDescription>Grant access to your dashboard.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateStaff} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="staff-name">Name</Label>
                            <Input id="staff-name" name="name" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="staff-email">Email</Label>
                            <Input id="staff-email" name="email" type="email" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="staff-role">Role</Label>
                            <select id="staff-role" name="role" className="w-full border rounded-md p-2">
                              <option value="manager">Manager (Full Access)</option>
                              <option value="staff">Staff (Limited Access)</option>
                            </select>
                          </div>
                          <Button type="submit" className="w-full">Add Member</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {staff.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {staff.map((s, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-md text-sm">
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-gray-500 text-xs">{s.email}</p>
                          </div>
                          <Badge variant="outline">{s.role}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${systemStatus?.status === 'Operational' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`font-bold ${systemStatus?.status === 'Operational' ? 'text-green-700' : 'text-red-700'}`}>{systemStatus?.status || 'Unknown'}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">API Latency (p95)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStatus?.latency || '0ms'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Database Load</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStatus?.dbLoad || '0%'}</div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent System Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemStatus?.events && systemStatus.events.length > 0 ? systemStatus.events.map((e: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                      <span>{e.event}</span>
                      <span className="text-gray-500">{e.time}</span>
                    </div>
                  )) : <p className="text-gray-500">No recent system events.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Maintenance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                   <div>
                     <h4 className="font-semibold">Data Backup</h4>
                     <p className="text-sm text-gray-500">Create a snapshot of all database records.</p>
                   </div>
                   <Button onClick={async () => {
                     await api.triggerBackup();
                     toast.success("Backup started successfully");
                   }}>Trigger Backup</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

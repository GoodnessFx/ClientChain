import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/lib/auth';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { 
  ArrowLeft,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Download
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as d3 from 'd3';
import type { Analytics, Referral } from '@/app/types';
import { toast } from 'sonner';

const COLORS = ['#9333ea', '#ec4899', '#8b5cf6', '#d946ef'];

export function NetworkAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const networkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadAnalytics();
  }, [user, navigate]);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const [analyticsData, referralsData] = await Promise.all([
        api.getUserAnalytics(user.id),
        api.getUserReferrals(user.id),
      ]);

      setAnalytics(analyticsData as Analytics);
      setReferrals(referralsData as Referral[]);
      
      // Render network visualization after data loads
      setTimeout(() => renderNetworkGraph(referralsData as Referral[]), 100);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const renderNetworkGraph = (referrals: Referral[]) => {
    if (!networkRef.current || referrals.length === 0) return;

    // Clear previous visualization
    d3.select(networkRef.current).selectAll('*').remove();

    const width = networkRef.current.clientWidth;
    const height = 400;

    // Create SVG
    const svg = d3.select(networkRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create nodes and links
    const nodes: any[] = [
      { id: user!.id, name: user!.name, type: 'user', value: 100 }
    ];

    const links: any[] = [];

    referrals.forEach(referral => {
      nodes.push({
        id: referral.id,
        name: referral.friendName,
        type: 'referral',
        status: referral.status,
        value: referral.status === 'booked' || referral.status === 'completed' ? 50 : 20
      });

      links.push({
        source: user!.id,
        target: referral.id,
        status: referral.status
      });
    });

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d: any) => {
        if (d.status === 'booked' || d.status === 'completed') return '#10b981';
        if (d.status === 'clicked') return '#3b82f6';
        return '#d1d5db';
      })
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d: any) => d.type === 'user' ? 20 : 12)
      .attr('fill', (d: any) => {
        if (d.type === 'user') return '#9333ea';
        if (d.status === 'booked' || d.status === 'completed') return '#10b981';
        if (d.status === 'clicked') return '#3b82f6';
        return '#9ca3af';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add labels
    const labels = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d: any) => d.name.split(' ')[0])
      .attr('font-size', 10)
      .attr('dx', 15)
      .attr('dy', 4)
      .attr('fill', '#374151');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const statusData = [
    { name: 'Pending', value: referrals.filter(r => r.status === 'pending').length },
    { name: 'Clicked', value: referrals.filter(r => r.status === 'clicked').length },
    { name: 'Booked', value: referrals.filter(r => r.status === 'booked' || r.status === 'completed').length },
  ].filter(d => d.value > 0);

  const methodData = [
    { name: 'Instagram DM', value: referrals.filter(r => r.method === 'dm').length },
    { name: 'SMS', value: referrals.filter(r => r.method === 'sms').length },
  ].filter(d => d.value > 0);

  // Generate time series data from referrals
  const timeSeriesData = (() => {
    const data: Record<string, { referrals: number, bookings: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    referrals.forEach(ref => {
        const date = new Date(ref.createdAt);
        const key = date.toLocaleString('default', { month: 'short' }); // e.g., "Jan"
        
        if (!data[key]) data[key] = { referrals: 0, bookings: 0 };
        data[key].referrals++;
        
        if (ref.status === 'booked' || ref.status === 'completed') {
            const bookDate = ref.bookedAt ? new Date(ref.bookedAt) : date;
            const bookKey = bookDate.toLocaleString('default', { month: 'short' });
            if (!data[bookKey]) data[bookKey] = { referrals: 0, bookings: 0 };
            data[bookKey].bookings++;
        }
    });

    return Object.entries(data)
        .map(([month, stats]) => ({ month, ...stats }))
        .sort((a, b) => months.indexOf(a.month) - months.indexOf(b.month));
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Network Analytics</h1>
              <p className="text-gray-600">Visualize your referral network and performance</p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalReferrals || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                All-time referrals sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.conversionRate || '0'}%</div>
              <p className="text-xs text-gray-500 mt-1">
                Referrals to bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics?.networkValue || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                Total value generated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Booked Referrals</CardTitle>
              <TrendingUp className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.bookedReferrals || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                Successful conversions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Network Visualization */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Referral Network</CardTitle>
            <CardDescription>
              Visual representation of your referral connections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div ref={networkRef} className="w-full bg-gray-50 rounded-lg border"></div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                <span>You</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Clicked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Referral Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Referral Status Breakdown</CardTitle>
              <CardDescription>Distribution of referral statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Method Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Method Performance</CardTitle>
              <CardDescription>Referrals by contact method</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={methodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#9333ea" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Referral Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Referral Trend</CardTitle>
            <CardDescription>Your referral activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="referrals" stroke="#9333ea" strokeWidth={2} name="Referrals Sent" />
                <Line type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} name="Bookings" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

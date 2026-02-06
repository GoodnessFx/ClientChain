import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/lib/auth';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Logo } from '@/app/components/Logo';
import { 
  LogOut, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Gift,
  Share2,
  BarChart3,
  Copy
} from 'lucide-react';
import type { Analytics, Referral, Booking } from '@/app/types';
import { toast } from 'sonner';

export function ClientDashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [analyticsData, referralsData, bookingsData, creditsData] = await Promise.all([
        api.getUserAnalytics(user.id),
        api.getUserReferrals(user.id),
        api.getUserBookings(user.id),
        api.getUserCredits(user.id),
      ]);

      setAnalytics(analyticsData as Analytics);
      setReferrals(referralsData as Referral[]);
      setBookings(bookingsData as Booking[]);
      setCredits(creditsData.credits);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo className="h-8" />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <Badge variant="outline" className="text-xs border-sky-200 text-sky-700">
                    {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                  </Badge>
                </div>
                <Avatar>
                  <AvatarFallback className="bg-sky-600 text-white font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-slate-600">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-slate-600">Here's what's happening with your referral network</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Available Credits</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Gift className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">${credits}</div>
              <p className="text-xs text-slate-500 mt-1">
                Earn $50 per referral booking
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Referrals</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{analytics?.totalReferrals || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                {analytics?.bookedReferrals || 0} converted to bookings
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Network Value</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">${analytics?.networkValue || 0}</div>
              <p className="text-xs text-slate-500 mt-1">
                Total value generated
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Conversion Rate</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-sky-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{analytics?.conversionRate || '0'}%</div>
              <p className="text-xs text-slate-500 mt-1">
                Referrals to bookings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button 
            className="h-auto py-6 flex flex-col gap-2 bg-sky-600 hover:bg-sky-700 text-white"
            onClick={() => navigate('/capture')}
          >
            <Share2 className="w-6 h-6" />
            <span className="font-semibold">Refer Friends</span>
            <span className="text-xs opacity-90">Earn $50 per booking</span>
          </Button>
          
          <Button 
            variant="outline"
            className="h-auto py-6 flex flex-col gap-2 border-slate-300 hover:bg-slate-50"
            onClick={() => navigate('/group-booking')}
          >
            <Users className="w-6 h-6 text-slate-700" />
            <span className="font-semibold text-slate-900">Book with Friends</span>
            <span className="text-xs text-slate-600">Save up to 35%</span>
          </Button>
          
          <Button 
            variant="outline"
            className="h-auto py-6 flex flex-col gap-2 border-slate-300 hover:bg-slate-50"
            onClick={() => navigate('/analytics')}
          >
            <BarChart3 className="w-6 h-6 text-slate-700" />
            <span className="font-semibold text-slate-900">View Analytics</span>
            <span className="text-xs text-slate-600">Track performance</span>
          </Button>
        </div>

        {/* Referral Code Card */}
        <Card className="mb-8 border-sky-200 bg-sky-50/50">
          <CardHeader>
            <CardTitle className="text-slate-900">Your Referral Code</CardTitle>
            <CardDescription className="text-slate-600">Share this code with friends to earn rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 p-4 bg-white rounded-lg border-2 border-dashed border-sky-300">
                <code className="text-2xl font-bold text-sky-600">{user.referralCode}</code>
              </div>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(user.referralCode);
                  toast.success('Referral code copied!');
                }}
                className="bg-sky-600 hover:bg-sky-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Referrals & Bookings */}
        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="referrals">My Referrals</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Recent Referrals</CardTitle>
                <CardDescription className="text-slate-600">Track the status of your friend referrals</CardDescription>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">No referrals yet</p>
                    <p className="text-sm text-slate-500 mt-2">Start referring friends to earn rewards!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {referrals.map((referral) => (
                      <div key={referral.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-medium text-slate-900">{referral.friendName}</p>
                          <p className="text-sm text-slate-500">{referral.friendContact}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            referral.status === 'completed' || referral.status === 'booked' ? 'default' :
                            referral.status === 'clicked' ? 'secondary' : 'outline'
                          } className={
                            referral.status === 'completed' || referral.status === 'booked' 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : referral.status === 'clicked'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : ''
                          }>
                            {referral.status}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(referral.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">My Bookings</CardTitle>
                <CardDescription className="text-slate-600">Your upcoming and past appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">No bookings yet</p>
                    <p className="text-sm text-slate-500 mt-2">Book your first treatment!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-medium text-slate-900">{booking.treatment}</p>
                          <p className="text-sm text-slate-500">
                            {new Date(booking.date).toLocaleDateString()} at {booking.time}
                          </p>
                          {booking.groupSize > 1 && (
                            <Badge variant="outline" className="mt-1 border-slate-300 text-slate-700">
                              Group of {booking.groupSize}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'} 
                            className={booking.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'}>
                            {booking.status}
                          </Badge>
                          {booking.discount > 0 && (
                            <p className="text-sm text-green-600 font-medium mt-1">
                              {(booking.discount * 100).toFixed(0)}% off
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
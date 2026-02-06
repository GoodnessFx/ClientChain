import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/lib/auth';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { 
  ArrowLeft,
  Users,
  ExternalLink,
  Copy,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { Referral } from '@/app/types';
import { toast } from 'sonner';

export function ReferralTracker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadReferrals();
  }, [user, navigate]);

  const loadReferrals = async () => {
    if (!user) return;

    try {
      const data = await api.getUserReferrals(user.id);
      setReferrals(data as Referral[]);
    } catch (error) {
      console.error('Failed to load referrals:', error);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  const clickedReferrals = referrals.filter(r => r.status === 'clicked');
  const bookedReferrals = referrals.filter(r => r.status === 'booked' || r.status === 'completed');

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'clicked':
        return <ExternalLink className="w-5 h-5 text-blue-400" />;
      case 'booked':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'outline',
      clicked: 'secondary',
      booked: 'default',
      completed: 'default',
    };
    return variants[status] || 'outline';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referrals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Referral Tracker</h1>
              <p className="text-gray-600">Monitor your referral performance and earnings</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/capture')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Add New Referrals
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Referrals</p>
                  <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-600">{pendingReferrals.length}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Clicked</p>
                  <p className="text-2xl font-bold text-blue-600">{clickedReferrals.length}</p>
                </div>
                <ExternalLink className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Booked</p>
                  <p className="text-2xl font-bold text-green-600">{bookedReferrals.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referrals List */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Referrals ({referrals.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingReferrals.length})</TabsTrigger>
            <TabsTrigger value="clicked">Clicked ({clickedReferrals.length})</TabsTrigger>
            <TabsTrigger value="booked">Booked ({bookedReferrals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ReferralList referrals={referrals} copyLink={copyLink} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>

          <TabsContent value="pending">
            <ReferralList referrals={pendingReferrals} copyLink={copyLink} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>

          <TabsContent value="clicked">
            <ReferralList referrals={clickedReferrals} copyLink={copyLink} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>

          <TabsContent value="booked">
            <ReferralList referrals={bookedReferrals} copyLink={copyLink} getStatusIcon={getStatusIcon} getStatusBadge={getStatusBadge} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface ReferralListProps {
  referrals: Referral[];
  copyLink: (link: string) => void;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusBadge: (status: string) => string;
}

function ReferralList({ referrals, copyLink, getStatusIcon, getStatusBadge }: ReferralListProps) {
  if (referrals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No referrals in this category</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {referrals.map((referral) => (
            <div key={referral.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">
                    {getStatusIcon(referral.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{referral.friendName}</h3>
                      <Badge variant={getStatusBadge(referral.status)}>
                        {referral.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {referral.method.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{referral.friendContact}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Sent: {new Date(referral.createdAt).toLocaleDateString()}</span>
                      {referral.clickedAt && (
                        <span>Clicked: {new Date(referral.clickedAt).toLocaleDateString()}</span>
                      )}
                      {referral.bookedAt && (
                        <span className="text-green-600 font-medium">
                          Booked: {new Date(referral.bookedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {referral.creditAwarded > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        ${referral.creditAwarded} credit earned
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLink(referral.trackingLink)}
                  className="ml-4"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

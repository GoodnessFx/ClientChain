import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/lib/auth';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { 
  ArrowLeft,
  Users,
  MessageCircle,
  Phone,
  Instagram,
  Check,
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Friend {
  name: string;
  contact: string;
  method: 'dm' | 'sms';
}

export function PostTreatmentCapture() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentFriend, setCurrentFriend] = useState({ name: '', contact: '', method: 'dm' as 'dm' | 'sms' });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Add friends, 2: Review & Send

  if (!user) {
    navigate('/login');
    return null;
  }

  const addFriend = () => {
    if (!currentFriend.name || !currentFriend.contact) {
      toast.error('Please enter friend name and contact');
      return;
    }

    setFriends([...friends, currentFriend]);
    setCurrentFriend({ name: '', contact: '', method: 'dm' });
    toast.success('Friend added!');
  };

  const removeFriend = (index: number) => {
    setFriends(friends.filter((_, i) => i !== index));
  };

  const handleSendReferrals = async () => {
    if (friends.length === 0) {
      toast.error('Please add at least one friend');
      return;
    }

    setLoading(true);

    try {
      // Create referrals for each friend
      const promises = friends.map(friend =>
        api.createReferral({
          friendName: friend.name,
          friendContact: friend.contact,
          method: friend.method,
        })
      );

      await Promise.all(promises);

      toast.success(`Successfully sent ${friends.length} referral${friends.length > 1 ? 's' : ''}!`);
      
      // Navigate to referral tracker
      setTimeout(() => {
        navigate('/referrals');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send referrals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Refer Your Friends</h1>
            <p className="text-gray-600">Share the experience and earn $50 per booking</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-purple-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="font-medium">Add Friends</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-purple-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="font-medium">Review & Send</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Add Friend Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Friends to Refer</CardTitle>
                <CardDescription>
                  Add at least 3 friends to maximize your referral rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="friendName">Friend's Name</Label>
                    <Input
                      id="friendName"
                      placeholder="Jane Smith"
                      value={currentFriend.name}
                      onChange={(e) => setCurrentFriend({ ...currentFriend, name: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && addFriend()}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="friendContact">Contact</Label>
                    <Input
                      id="friendContact"
                      placeholder="@username or phone"
                      value={currentFriend.contact}
                      onChange={(e) => setCurrentFriend({ ...currentFriend, contact: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && addFriend()}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Contact Method</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={currentFriend.method === 'dm' ? 'default' : 'outline'}
                      onClick={() => setCurrentFriend({ ...currentFriend, method: 'dm' })}
                      className="flex-1"
                    >
                      <Instagram className="w-4 h-4 mr-2" />
                      Instagram DM
                    </Button>
                    <Button
                      type="button"
                      variant={currentFriend.method === 'sms' ? 'default' : 'outline'}
                      onClick={() => setCurrentFriend({ ...currentFriend, method: 'sms' })}
                      className="flex-1"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      SMS
                    </Button>
                  </div>
                </div>

                <Button onClick={addFriend} className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Friend
                </Button>
              </CardContent>
            </Card>

            {/* Friends List */}
            {friends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Friends Added ({friends.length})</CardTitle>
                  <CardDescription>
                    Review your list before sending referrals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {friends.map((friend, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{friend.name}</p>
                            <p className="text-sm text-gray-500">{friend.contact}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {friend.method === 'dm' ? 
                              <><Instagram className="w-3 h-3 mr-1" /> DM</> : 
                              <><Phone className="w-3 h-3 mr-1" /> SMS</>
                            }
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFriend(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={() => setStep(2)} 
                    className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    disabled={friends.length === 0}
                  >
                    Continue to Review
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Review Card */}
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle>Review Your Referrals</CardTitle>
                <CardDescription>
                  You're about to send referrals to {friends.length} friend{friends.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {friends.map((friend, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <Check className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">{friend.name}</p>
                        <p className="text-sm text-gray-600">via {friend.method === 'dm' ? 'Instagram DM' : 'SMS'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rewards Info */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Your Potential Rewards</h4>
                  <p className="text-sm text-green-800">
                    If all {friends.length} friend{friends.length > 1 ? 's book' : ' books'}, you'll earn:
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    ${friends.length * 50}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    $50 credit per successful booking
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Edit
                  </Button>
                  <Button 
                    onClick={handleSendReferrals}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? 'Sending...' : 'Send Referrals'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Message Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Message Preview</CardTitle>
                <CardDescription>
                  This is what your friends will receive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed">
                  <p className="text-sm text-gray-700">
                    Hey! 👋 I just had an amazing experience at [Med Spa Name] and thought of you! 
                    I'm sharing my exclusive referral link so you can get a special discount on your first treatment.
                  </p>
                  <p className="text-sm text-gray-700 mt-3">
                    ✨ Use code: <strong className="text-purple-600">{user.referralCode}</strong>
                  </p>
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-xs text-gray-500">Book now:</p>
                    <p className="text-sm font-medium text-purple-600">https://clientchain.app/book?ref={user.referralCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

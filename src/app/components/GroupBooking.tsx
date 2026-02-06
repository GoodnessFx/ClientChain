import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/lib/auth';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { 
  ArrowLeft,
  Users,
  DollarSign,
  Calendar,
  Clock,
  TrendingDown,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

const TREATMENTS = [
  { id: 'botox', name: 'Botox', basePrice: 400, duration: '30 min' },
  { id: 'filler', name: 'Dermal Fillers', basePrice: 600, duration: '45 min' },
  { id: 'laser', name: 'Laser Treatment', basePrice: 350, duration: '60 min' },
  { id: 'facial', name: 'HydraFacial', basePrice: 250, duration: '45 min' },
  { id: 'prp', name: 'PRP Therapy', basePrice: 500, duration: '60 min' },
];

export function GroupBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groupSize, setGroupSize] = useState(2);
  const [selectedTreatment, setSelectedTreatment] = useState(TREATMENTS[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [friends, setFriends] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [bookingLink, setBookingLink] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const getDiscount = (size: number): number => {
    if (size === 2) return 0.25;
    if (size >= 3 && size <= 4) return 0.30;
    if (size >= 5) return 0.35;
    return 0;
  };

  const discount = getDiscount(groupSize);
  const originalTotal = selectedTreatment.basePrice * groupSize;
  const savings = originalTotal * discount;
  const finalTotal = originalTotal - savings;
  const pricePerPerson = finalTotal / groupSize;

  const updateGroupSize = (size: number) => {
    setGroupSize(Math.max(2, Math.min(10, size)));
    const newFriends = Array(Math.max(2, Math.min(10, size))).fill('').map((_, i) => friends[i] || '');
    setFriends(newFriends);
  };

  const handleCreateBooking = async () => {
    if (!date || !time) {
      toast.error('Please select date and time');
      return;
    }

    const filledFriends = friends.filter(f => f.trim());
    if (filledFriends.length < groupSize - 1) {
      toast.error(`Please add ${groupSize - 1} friend${groupSize > 2 ? 's' : ''}`);
      return;
    }

    setLoading(true);

    try {
      const response = await api.createBooking({
        userId: user.id,
        medSpaId: user.medSpaId || 'medspa:default',
        treatment: selectedTreatment.name,
        date,
        time,
        groupSize,
      });

      const link = `https://clientchain.app/group-booking/${response.bookingId}`;
      setBookingLink(link);
      setShowSuccess(true);
      toast.success('Group booking created!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(bookingLink);
    toast.success('Link copied to clipboard!');
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-2 border-green-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Booking Created Successfully!</CardTitle>
            <CardDescription>
              Share this link with your group to coordinate the booking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-sm text-gray-600 mb-2">Booking Link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm break-all">{bookingLink}</code>
                <Button size="sm" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Treatment</p>
                <p className="font-semibold">{selectedTreatment.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Group Size</p>
                <p className="font-semibold">{groupSize} people</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-semibold">{new Date(date).toLocaleDateString()} at {time}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Price Per Person</p>
                <p className="font-semibold text-green-600">${pricePerPerson.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => navigate('/dashboard')} className="flex-1">
                Go to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowSuccess(false);
                  setBookingLink('');
                }} 
                className="flex-1"
              >
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Group Booking</h1>
            <p className="text-gray-600">Book with friends and save up to 35%</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Treatment Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Treatment</CardTitle>
                <CardDescription>Choose the service you'd like to book</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TREATMENTS.map((treatment) => (
                    <button
                      key={treatment.id}
                      onClick={() => setSelectedTreatment(treatment)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedTreatment.id === treatment.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{treatment.name}</h3>
                        {selectedTreatment.id === treatment.id && (
                          <Check className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${treatment.basePrice}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {treatment.duration}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Group Size */}
            <Card>
              <CardHeader>
                <CardTitle>Group Size</CardTitle>
                <CardDescription>How many people will be joining?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateGroupSize(groupSize - 1)}
                    disabled={groupSize <= 2}
                  >
                    -
                  </Button>
                  <div className="flex-1 text-center">
                    <div className="text-4xl font-bold text-purple-600">{groupSize}</div>
                    <p className="text-sm text-gray-500">people</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateGroupSize(groupSize + 1)}
                    disabled={groupSize >= 10}
                  >
                    +
                  </Button>
                </div>

                {/* Discount tiers indicator */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className={`p-2 rounded ${groupSize === 2 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="font-semibold">2 people</div>
                    <div>25% off</div>
                  </div>
                  <div className={`p-2 rounded ${groupSize >= 3 && groupSize <= 4 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="font-semibold">3-4 people</div>
                    <div>30% off</div>
                  </div>
                  <div className={`p-2 rounded ${groupSize >= 5 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="font-semibold">5+ people</div>
                    <div>35% off</div>
                  </div>
                </div>

                {/* Friends list */}
                <div className="space-y-2">
                  <Label>Add Your Friends</Label>
                  {friends.map((friend, index) => (
                    <Input
                      key={index}
                      placeholder={`Friend ${index + 1} email or phone`}
                      value={friend}
                      onChange={(e) => {
                        const newFriends = [...friends];
                        newFriends[index] = e.target.value;
                        setFriends(newFriends);
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>When would you like to book?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-6">
            <Card className="sticky top-4 border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Treatment</p>
                  <p className="font-semibold">{selectedTreatment.name}</p>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base Price (x{groupSize})</span>
                    <span>${selectedTreatment.basePrice} ea</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>${originalTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      Group Discount ({(discount * 100).toFixed(0)}%)
                    </span>
                    <span>-${savings.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-purple-600">${finalTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Price per person</p>
                    <p className="text-xl font-bold text-purple-600">${pricePerPerson.toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-semibold text-green-900">You're saving:</p>
                  <p className="text-2xl font-bold text-green-600">${savings.toFixed(2)}</p>
                  <p className="text-xs text-green-700 mt-1">vs booking individually</p>
                </div>

                <Button 
                  onClick={handleCreateBooking}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {loading ? 'Creating...' : 'Create Group Booking'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By booking, you agree to coordinate payment with your group
                </p>
              </CardContent>
            </Card>

            {/* Live viewers (simulated) */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">
                    {Math.floor(Math.random() * 5) + 3} people viewing this offer
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

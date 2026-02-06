import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { api } from '@/app/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  Check,
  Gift
} from 'lucide-react';
import type { Event } from '@/app/types';
import { toast } from 'sonner';

export function EventLanding() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;

    try {
      const data = await api.getEvent(eventId);
      setEvent(data as Event);
    } catch (error) {
      console.error('Failed to load event:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    setSubmitting(true);

    try {
      await api.rsvpEvent(eventId, formData);
      setRegistered(true);
      toast.success('RSVP confirmed! See you there!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to RSVP');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Event not found</p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const spotsRemaining = event.maxAttendees - event.rsvps.length;
  const isFull = spotsRemaining <= 0;

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
        <Card className="max-w-2xl w-full border-2 border-green-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">You're Registered!</CardTitle>
            <CardDescription>
              We've sent a confirmation to {formData.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-purple-50 rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-sm text-gray-600">{event.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Clock className="w-4 h-4" />
                <span>{event.time}</span>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Host Rewards
              </h4>
              <p className="text-sm text-yellow-800">
                Share this event with friends! When 5 people RSVP, the host gets a free treatment worth up to $400.
              </p>
            </div>

            <Button onClick={() => navigate('/')} className="w-full">
              Explore More Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <Badge className="mb-4 bg-purple-600">
                {event.status === 'upcoming' ? 'Upcoming Event' : event.status}
              </Badge>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.name}</h1>
              <p className="text-lg text-gray-600">
                Join us for an exclusive beauty experience with friends
              </p>
            </div>

            {/* Event Info Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Date</p>
                      <p className="text-sm text-gray-600">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Time</p>
                      <p className="text-sm text-gray-600">{event.time}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Location</p>
                      <p className="text-sm text-gray-600">{event.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-900">Attendees</p>
                      <p className="text-sm text-gray-600">
                        {event.rsvps.length} / {event.maxAttendees} registered
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Join us for an exclusive beauty and wellness event where you and your friends can experience premium treatments in a fun, social atmosphere.
                </p>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">What's Included:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Premium treatments at group discount prices</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Complimentary refreshments and snacks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Exclusive product samples and gift bags</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Professional consultation and skin analysis</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Host Rewards */}
            <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-yellow-600" />
                  Host Rewards Program
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <span className="font-bold text-yellow-700">5</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">RSVPs = Free Treatment</p>
                      <p className="text-sm text-gray-600">Up to $400 value</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <span className="font-bold text-yellow-700">10</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">RSVPs = VIP Platinum Status</p>
                      <p className="text-sm text-gray-600">Lifetime perks and priority booking</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RSVP Form */}
          <div className="lg:col-span-2">
            <Card className="sticky top-4 border-2 border-purple-200">
              <CardHeader>
                <CardTitle>Reserve Your Spot</CardTitle>
                <CardDescription>
                  {isFull ? (
                    <span className="text-red-600 font-medium">Event is full</span>
                  ) : spotsRemaining <= 5 ? (
                    <span className="text-yellow-600 font-medium">Only {spotsRemaining} spots left!</span>
                  ) : (
                    <span>{spotsRemaining} spots available</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isFull ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">This event is currently full.</p>
                    <p className="text-sm text-gray-500">Check back later for more events!</p>
                  </div>
                ) : (
                  <form onSubmit={handleRSVP} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Jane Smith"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@example.com"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {submitting ? 'Reserving...' : 'Reserve My Spot'}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      Free to RSVP • No payment required now
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

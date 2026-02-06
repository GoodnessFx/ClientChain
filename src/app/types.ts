// Core type definitions for ClientChain

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'staff' | 'admin';
  medSpaId?: string;
  createdAt: string;
  credits: number;
  referralCode: string;
  tier: 'standard' | 'vip' | 'platinum';
  totalReferrals: number;
  networkValue: number;
}

export interface MedSpa {
  id: string;
  name: string;
  address: string;
  phone: string;
  ownerId: string;
  createdAt: string;
  settings: {
    branding: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    features: {
      groupBooking?: boolean;
      events?: boolean;
      corporate?: boolean;
    };
    pricing: {
      setupFee?: number;
      monthlyFee?: number;
      revenueShare?: number;
    };
  };
  subscription: {
    plan: 'trial' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due';
  };
}

export interface Referral {
  id: string;
  referrerId: string;
  friendName: string;
  friendContact: string;
  method: 'dm' | 'sms' | 'story' | 'event';
  campaignId?: string;
  trackingLink: string;
  status: 'pending' | 'clicked' | 'booked' | 'completed';
  createdAt: string;
  clickedAt?: string;
  bookedAt?: string;
  completedAt?: string;
  creditAwarded: number;
}

export interface Booking {
  id: string;
  userId: string;
  medSpaId: string;
  treatment: string;
  date: string;
  time: string;
  groupSize: number;
  discount: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  referralId?: string;
}

export interface Campaign {
  id: string;
  medSpaId: string;
  name: string;
  type: 'post-treatment' | 'story' | 'event' | 'group-booking';
  discountAmount: number;
  startDate: string;
  endDate: string;
  targeting: Record<string, any>;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  metrics: {
    views: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

export interface Event {
  id: string;
  medSpaId: string;
  hostId: string;
  name: string;
  date: string;
  time: string;
  location: string;
  maxAttendees: number;
  slug: string;
  landingPageUrl: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  rsvps: Array<{
    name: string;
    email: string;
    phone: string;
    rsvpedAt: string;
  }>;
  attendees: string[];
}

export interface Analytics {
  totalReferrals: number;
  clickedReferrals: number;
  bookedReferrals: number;
  conversionRate: string;
  networkValue: number;
  referralsByMonth: Record<string, number>;
  topPerformingMethods: Record<string, number>;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: 'client' | 'referral';
  value: number;
  tier: number;
  children?: NetworkNode[];
}

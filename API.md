# API Documentation

Complete API reference for ClientChain backend services.

## Base URL

```
https://{project-id}.supabase.co/functions/v1/make-server-0491752a
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer {access_token}
```

Get the access token after signing in via Supabase Auth.

## Endpoints

### Health Check

Check if the server is running.

**Endpoint**: `GET /health`

**Auth Required**: No

**Response**:
```json
{
  "status": "ok"
}
```

---

## Authentication

### Sign Up

Create a new user account.

**Endpoint**: `POST /auth/signup`

**Auth Required**: No

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "client",  // optional: "client" (default), "staff", "admin"
  "medSpaId": "medspa:123"  // optional: required for admin/staff
}
```

**Response** (201):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe",
      "role": "client"
    }
  },
  "message": "User created successfully"
}
```

**Error Response** (400):
```json
{
  "error": "Failed to create user: Email already exists"
}
```

### Sign In

Sign in with email and password. (Usually handled client-side via Supabase Auth)

**Endpoint**: `POST /auth/signin`

**Auth Required**: No

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** (200):
```json
{
  "session": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token",
    "user": { /* user object */ }
  }
}
```

---

## Users

### Get User Profile

Retrieve a user's profile information.

**Endpoint**: `GET /users/:id`

**Auth Required**: Yes

**URL Parameters**:
- `id`: User UUID

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "client",
  "medSpaId": null,
  "createdAt": "2026-01-15T10:00:00Z",
  "credits": 150,
  "referralCode": "REF-ABC123",
  "tier": "vip",
  "totalReferrals": 8,
  "networkValue": 2400
}
```

### Update User Profile

Update user information.

**Endpoint**: `PUT /users/:id`

**Auth Required**: Yes

**URL Parameters**:
- `id`: User UUID

**Request Body**:
```json
{
  "name": "Jane Doe",
  "tier": "platinum"
}
```

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "tier": "platinum",
  "updatedAt": "2026-02-05T12:00:00Z"
}
```

---

## Referrals

### Create Referral

Create a new referral.

**Endpoint**: `POST /referrals`

**Auth Required**: Yes

**Request Body**:
```json
{
  "friendName": "Jane Smith",
  "friendContact": "jane@example.com",
  "method": "dm",  // "dm", "sms", "story", "event"
  "campaignId": "campaign:123"  // optional
}
```

**Response** (201):
```json
{
  "referralId": "referral:uuid",
  "trackingLink": "https://clientchain.app/r/uuid"
}
```

### Track Referral Click

Track when a referral link is clicked.

**Endpoint**: `POST /referrals/:id/click`

**Auth Required**: No

**URL Parameters**:
- `id`: Referral ID (without "referral:" prefix)

**Response** (200):
```json
{
  "message": "Click tracked"
}
```

### Get User Referrals

Get all referrals for a specific user.

**Endpoint**: `GET /users/:userId/referrals`

**Auth Required**: Yes

**URL Parameters**:
- `userId`: User UUID

**Response** (200):
```json
[
  {
    "id": "referral:uuid",
    "referrerId": "user-uuid",
    "friendName": "Jane Smith",
    "friendContact": "jane@example.com",
    "method": "dm",
    "trackingLink": "https://clientchain.app/r/uuid",
    "status": "booked",
    "createdAt": "2026-01-20T10:00:00Z",
    "clickedAt": "2026-01-20T11:30:00Z",
    "bookedAt": "2026-01-21T14:00:00Z",
    "creditAwarded": 50
  }
]
```

---

## Bookings

### Create Booking

Create a new booking.

**Endpoint**: `POST /bookings`

**Auth Required**: Yes

**Request Body**:
```json
{
  "userId": "user-uuid",
  "medSpaId": "medspa:123",
  "treatment": "Botox",
  "date": "2026-03-15",
  "time": "14:00",
  "groupSize": 3,  // optional, default: 1
  "referralId": "referral:uuid"  // optional
}
```

**Response** (201):
```json
{
  "bookingId": "booking:uuid",
  "discount": 0.30  // 30% discount for group of 3
}
```

**Discount Structure**:
- 2 people: 25%
- 3-4 people: 30%
- 5+ people: 35%

### Get User Bookings

Get all bookings for a user.

**Endpoint**: `GET /users/:userId/bookings`

**Auth Required**: Yes

**URL Parameters**:
- `userId`: User UUID

**Response** (200):
```json
[
  {
    "id": "booking:uuid",
    "userId": "user-uuid",
    "medSpaId": "medspa:123",
    "treatment": "Botox",
    "date": "2026-03-15",
    "time": "14:00",
    "groupSize": 3,
    "discount": 0.30,
    "status": "confirmed",
    "createdAt": "2026-02-05T10:00:00Z"
  }
]
```

### Apply Credits to Booking

Apply user credits to reduce booking cost.

**Endpoint**: `POST /bookings/:bookingId/apply-credits`

**Auth Required**: Yes

**URL Parameters**:
- `bookingId`: Booking ID

**Request Body**:
```json
{
  "creditsToApply": 50
}
```

**Response** (200):
```json
{
  "message": "Credits applied",
  "remainingCredits": 100
}
```

---

## Med Spas

### Create Med Spa

Create a new med spa.

**Endpoint**: `POST /medspas`

**Auth Required**: Yes

**Request Body**:
```json
{
  "name": "Radiance Med Spa",
  "address": "123 Beauty Lane, San Francisco, CA 94102",
  "phone": "(415) 555-0123",
  "settings": {
    "branding": {
      "primaryColor": "#0ea5e9",
      "secondaryColor": "#0f172a"
    },
    "features": {
      "groupBooking": true,
      "events": true,
      "corporate": true
    },
    "pricing": {
      "setupFee": 499,
      "monthlyFee": 199,
      "revenueShare": 0.05
    }
  }
}
```

**Response** (201):
```json
{
  "medSpaId": "medspa:uuid",
  "message": "Med spa created successfully"
}
```

### Get Med Spa Details

Get details for a specific med spa.

**Endpoint**: `GET /medspas/:id`

**Auth Required**: Yes

**URL Parameters**:
- `id`: Med spa ID

**Response** (200):
```json
{
  "id": "medspa:uuid",
  "name": "Radiance Med Spa",
  "address": "123 Beauty Lane, San Francisco, CA 94102",
  "phone": "(415) 555-0123",
  "ownerId": "user-uuid",
  "createdAt": "2026-01-01T00:00:00Z",
  "settings": { /* settings object */ },
  "subscription": {
    "plan": "pro",
    "status": "active"
  }
}
```

---

## Campaigns

### Create Campaign

Create a marketing campaign.

**Endpoint**: `POST /campaigns`

**Auth Required**: Yes

**Request Body**:
```json
{
  "medSpaId": "medspa:123",
  "name": "Spring Special 2026",
  "type": "post-treatment",  // "post-treatment", "story", "event", "group-booking"
  "discountAmount": 20,
  "startDate": "2026-03-01",
  "endDate": "2026-04-30",
  "targeting": {
    "tier": ["vip", "platinum"],
    "minReferrals": 5
  }
}
```

**Response** (201):
```json
{
  "campaignId": "campaign:uuid"
}
```

### Get Med Spa Campaigns

Get all campaigns for a med spa.

**Endpoint**: `GET /medspas/:medSpaId/campaigns`

**Auth Required**: Yes

**URL Parameters**:
- `medSpaId`: Med spa ID

**Response** (200):
```json
[
  {
    "id": "campaign:uuid",
    "medSpaId": "medspa:123",
    "name": "Spring Special 2026",
    "type": "post-treatment",
    "discountAmount": 20,
    "startDate": "2026-03-01",
    "endDate": "2026-04-30",
    "status": "active",
    "metrics": {
      "views": 1523,
      "clicks": 234,
      "conversions": 45,
      "revenue": 13500
    }
  }
]
```

---

## Events

### Create Event

Create a new event (e.g., Botox party).

**Endpoint**: `POST /events`

**Auth Required**: Yes

**Request Body**:
```json
{
  "medSpaId": "medspa:123",
  "name": "Spring Botox Party",
  "date": "2026-03-20",
  "time": "18:00",
  "location": "Radiance Med Spa",
  "maxAttendees": 15
}
```

**Response** (201):
```json
{
  "eventId": "event:uuid",
  "landingPageUrl": "https://clientchain.app/events/uuid"
}
```

### Get Event Details

Get details for a specific event.

**Endpoint**: `GET /events/:id`

**Auth Required**: No

**URL Parameters**:
- `id`: Event ID (without "event:" prefix)

**Response** (200):
```json
{
  "id": "event:uuid",
  "medSpaId": "medspa:123",
  "hostId": "user-uuid",
  "name": "Spring Botox Party",
  "date": "2026-03-20",
  "time": "18:00",
  "location": "Radiance Med Spa",
  "maxAttendees": 15,
  "status": "upcoming",
  "rsvps": [
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+14155550123",
      "rsvpedAt": "2026-02-05T10:00:00Z"
    }
  ]
}
```

### RSVP to Event

RSVP to an event.

**Endpoint**: `POST /events/:id/rsvp`

**Auth Required**: No

**URL Parameters**:
- `id`: Event ID (without "event:" prefix)

**Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+14155550123"
}
```

**Response** (200):
```json
{
  "message": "RSVP confirmed"
}
```

**Error Response** (400):
```json
{
  "error": "Event is full"
}
```

---

## Analytics

### Get User Analytics

Get analytics for a specific user.

**Endpoint**: `GET /users/:userId/analytics`

**Auth Required**: Yes

**URL Parameters**:
- `userId`: User UUID

**Response** (200):
```json
{
  "totalReferrals": 15,
  "clickedReferrals": 12,
  "bookedReferrals": 8,
  "conversionRate": "53.3",
  "networkValue": 4500,
  "referralsByMonth": {},
  "topPerformingMethods": {}
}
```

### Get Med Spa Analytics

Get analytics for a med spa.

**Endpoint**: `GET /medspas/:medSpaId/analytics`

**Auth Required**: Yes

**URL Parameters**:
- `medSpaId`: Med spa ID

**Response** (200):
```json
{
  "totalBookings": 234,
  "referralBookings": 156,
  "referralRate": "66.7",
  "totalReferrals": 345,
  "revenue": 70200,
  "activeClients": 89
}
```

---

## Credits

### Get User Credits

Get the credit balance for a user.

**Endpoint**: `GET /users/:userId/credits`

**Auth Required**: Yes

**URL Parameters**:
- `userId`: User UUID

**Response** (200):
```json
{
  "credits": 150
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limits

Supabase Edge Functions have built-in rate limiting. Typical limits:
- 100 requests per minute per IP
- Burst up to 200 requests

For higher limits, upgrade your Supabase plan.

## SDK Usage

Use the provided API client in `src/app/lib/api.ts`:

```typescript
import { api } from '@/app/lib/api';

// Create a referral
const result = await api.createReferral({
  friendName: "Jane Smith",
  friendContact: "jane@example.com",
  method: "dm"
});

// Get user analytics
const analytics = await api.getUserAnalytics(userId);
```

---

**Last Updated**: February 2026

import { createBrowserRouter } from "react-router";
import { Root } from "@/app/components/Root";
import { Login } from "@/app/components/Login";
import { Signup } from "@/app/components/Signup";
import { ClientDashboard } from "@/app/components/ClientDashboard";
import { AdminDashboard } from "@/app/components/AdminDashboard";
import { PostTreatmentCapture } from "@/app/components/PostTreatmentCapture";
import { GroupBooking } from "@/app/components/GroupBooking";
import { NetworkAnalytics } from "@/app/components/NetworkAnalytics";
import { EventLanding } from "@/app/components/EventLanding";
import { ReferralTracker } from "@/app/components/ReferralTracker";
import { NotFound } from "@/app/components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Login },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "dashboard", Component: ClientDashboard },
      { path: "admin", Component: AdminDashboard },
      { path: "capture", Component: PostTreatmentCapture },
      { path: "group-booking", Component: GroupBooking },
      { path: "analytics", Component: NetworkAnalytics },
      { path: "events/:eventId", Component: EventLanding },
      { path: "referrals", Component: ReferralTracker },
      { path: "*", Component: NotFound },
    ],
  },
]);

import { createFileRoute } from "@tanstack/react-router";
import { Award, Bell, ClipboardList, CreditCard, LayoutDashboard, MessageSquare, User } from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";

const items: NavItem[] = [
  { to: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/registrations", label: "Mes inscriptions", icon: ClipboardList },
  { to: "/dashboard/feedback", label: "Mes avis", icon: MessageSquare },
  { to: "/dashboard/complaints", label: "Mes réclamations", icon: MessageSquare },
  { to: "/dashboard/payments", label: "Paiements", icon: CreditCard },
  { to: "/dashboard/certificates", label: "Certificats", icon: Award },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/profile", label: "Profil", icon: User },
];

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Academy — i-Motion Academy" }, { name: "robots", content: "noindex" }] }),
  component: () => <DashboardLayout title="My Academy" role="PARTICIPANT" items={items} />,
});

import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { DashboardLayout, type NavItem } from "@/components/layout/DashboardLayout";

const items: NavItem[] = [
  { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/admin/trainings", label: "Formations", icon: GraduationCap },
  { to: "/admin/trainers", label: "Formateurs", icon: UserRound },
  { to: "/admin/locations", label: "Lieux", icon: MapPin },
  { to: "/admin/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/admin/registrations", label: "Inscriptions", icon: ClipboardList },
  { to: "/admin/participants", label: "Participants", icon: Users },
  { to: "/admin/payments", label: "Paiements", icon: CreditCard },
  { to: "/admin/certificates", label: "Certificats", icon: Award },
  { to: "/admin/feedback", label: "Modération des avis", icon: MessageSquare },
  { to: "/admin/complaints", label: "Réclamations", icon: MessageSquare },
  { to: "/admin/contact-requests", label: "Demandes de contact", icon: Mail },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/audit", label: "Journaux d'audit", icon: ShieldCheck },
  { to: "/admin/analytics", label: "Analytique", icon: BarChart3 },
];

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Administration — i-Motion Academy" }, { name: "robots", content: "noindex" }],
  }),
  component: () => <DashboardLayout title="Administration" role="ADMIN" items={items} />,
});

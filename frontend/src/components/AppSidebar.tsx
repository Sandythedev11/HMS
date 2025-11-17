import { Home, Users, MessageSquare, Bed, FileText, Wallet, Calendar, Info } from "lucide-react";
import { isAdmin as checkIsAdmin } from "../utils/auth";
import { Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const studentLinks = [
  { title: "Dashboard", url: "/student/dashboard", icon: Home },
  { title: "Notices", url: "/notice", icon: Info },
  { title: "Rooms", url: "/student-room", icon: Bed },
  { title: "Fees", url: "/fee-payment", icon: Wallet },
  { title: "Complaints", url: "/complaint", icon: MessageSquare },
  { title: "Feedback", url: "/feedback", icon: FileText },
];

const adminLinks = [
  { title: "Dashboard", url: "/admin/dashboard", icon: Home },
  { title: "Notices", url: "/notice", icon: Info },
  { title: "Rooms", url: "/room", icon: Bed },
  { title: "Complaints", url: "/complaint", icon: MessageSquare },
  { title: "Students", url: "/admin/student-management", icon: Users },
  { title: "Fee Management", url: "/admin/fee-payment", icon: Wallet },
  { title: "Feedback", url: "/admin/feedback", icon: FileText },
];

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  // Check directly from auth state to ensure consistency
  const userIsAdmin = checkIsAdmin();
  const effectiveIsAdmin = userIsAdmin || isAdmin;
  const links = effectiveIsAdmin ? adminLinks : studentLinks;

  return (
    <Sidebar className="min-h-screen bg-sidebar-primary text-sidebar-foreground">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <span className="font-bold text-lg tracking-wide">HMS</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url} className="flex gap-2 items-center p-2 rounded-md hover:bg-primary/10 transition">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

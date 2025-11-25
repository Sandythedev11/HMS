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
    <Sidebar className="min-h-screen bg-sidebar-primary dark:bg-gray-900 text-sidebar-foreground dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2">
            <Link 
              to="/" 
              className="font-bold text-2xl tracking-wide bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent hover:from-purple-600 hover:to-blue-600 dark:hover:from-purple-400 dark:hover:to-blue-400 transition-all duration-300 flex items-center gap-2 group"
            >
              <span className="group-hover:scale-110 transition-transform duration-300">🏨</span>
              <span>HMS</span>
            </Link>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.url} 
                      className="flex gap-3 items-center p-3 rounded-lg hover:bg-primary/10 dark:hover:bg-gray-800 transition-all duration-200 group"
                    >
                      <item.icon className="w-5 h-5 text-primary dark:text-blue-400 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors duration-200">
                        {item.title}
                      </span>
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

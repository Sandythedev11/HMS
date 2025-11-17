import { Home, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { isAdmin as checkIsAdmin, getDashboardUrl } from "../utils/auth";

export function AppHeader() {
  const isUserAdmin = checkIsAdmin();
  const dashboardUrl = getDashboardUrl();

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-sm py-2 px-4 flex justify-between items-center">
      <div className="flex items-center">
        <Link to={dashboardUrl} className="flex items-center gap-2 mr-6">
          <Home className="w-5 h-5 text-primary" />
          <span className="font-semibold text-primary">Dashboard</span>
        </Link>
      </div>
      <div>
        <Link
          to="/?from=dashboard"
          className="flex items-center gap-2 text-sm font-medium bg-gradient-to-r from-primary/90 to-primary text-white px-4 py-2 rounded-full hover:shadow-md transition-all duration-300 ease-in-out"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>
    </header>
  );
} 
import { Link, useLocation } from "react-router-dom";
import { useAuth } from '../hooks/useAuth'

const links = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/leads", label: "Leads" },
  { path: "/messages", label: "Messages" },
  { path: "/analytics", label: "Analytics" },
  { path: "/settings", label: "Settings" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <span className="font-bold text-gray-900 text-lg">OutreachMachine</span>
      </div>

      <div className="flex gap-1">
        {links.map((link) => (
          <Link
            key={link["path"]}
            to={link["path"]}
            className={
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors " +
              (pathname === link["path"]
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-100")
            }
          >
            {link["label"]}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <img
              src={user["avatar"]}
              alt={user["name"]}
              className="w-8 h-8 rounded-full border border-gray-200"
            />
            <span className="text-sm text-gray-600">{user["name"]}</span>
            <button
              onClick={logout}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

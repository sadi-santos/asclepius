import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Users, Calendar, User as UserIcon, LogOut, Menu, X, Heart, Activity } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useState } from "react";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  const navLinks = [
    { to: "/", label: "Dashboard", icon: Home, end: true },
    { to: "/patients", label: "Pacientes", icon: Users },
    { to: "/professionals", label: "Profissionais", icon: UserIcon },
    { to: "/appointments", label: "Agendamentos", icon: Calendar },
  ];

  const linkClassName = ({ isActive }: { isActive: boolean }) =>
    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all " +
    (isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200/70
        transform transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} shadow-sm`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-xl"><Heart className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <h1 className="font-bold text-gray-900">Asclepius</h1>
                  <p className="text-xs text-gray-500">SGHSS</p>
                </div>
              </div>
              <button className="md:hidden p-1 hover:bg-gray-100 rounded" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClassName} onClick={() => setSidebarOpen(false)}>
                <l.icon size={18} /><span>{l.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200/70">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full grid place-items-center"><UserIcon size={16} className="text-gray-600" /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.email?.split("@")[0]}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              <LogOut size={16} /><span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200/70 px-4 py-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center justify-between">
            <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
              <Activity className="h-4 w-4 text-green-500" /><span>Online</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6"><div className="max-w-7xl mx-auto"><Outlet /></div></main>
      </div>
    </div>
  );
}


import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, User, Calculator, Briefcase, Target, Calendar, Plug } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/carteira-conjunta', label: 'Carteira Conjunta', icon: Wallet },
    { path: '/carteira-individual', label: 'Carteira Individual', icon: User },
    { path: '/rateio', label: 'Rateio', icon: Calculator },
    { path: '/pf-pj', label: 'PF/PJ', icon: Briefcase },
    { path: '/metas', label: 'Metas', icon: Target },
    { path: '/calendario', label: 'Calendário', icon: Calendar },
    { path: '/integrations', label: 'Integrações', icon: Plug }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

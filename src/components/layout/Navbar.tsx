import { useAuthStore } from '../../stores/authStore';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import db from '../../db/db';
import { LowStockAlert } from '../../types';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const lowStockAlerts = await db.lowStockAlerts
        .where('resolved')
        .equals(false)
        .toArray();
      
      setAlerts(lowStockAlerts);
    };

    fetchAlerts();

    // Listen for new alerts
    const handleNewAlert = () => {
      fetchAlerts();
    };

    window.addEventListener('low-stock-alert', handleNewAlert);
    
    return () => {
      window.removeEventListener('low-stock-alert', handleNewAlert);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlerts(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button 
              onClick={toggleSidebar}
              className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="flex-shrink-0 flex items-center ml-2 md:ml-0">
              <h1 className="text-xl font-bold text-blue-600">StockManager</h1>
            </div>
          </div>
          
          <div className="flex items-center">
            {/* Notifications */}
            <div className="relative ml-3" ref={alertsRef}>
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="p-1 rounded-full text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
              >
                <Bell size={20} />
                {alerts.length > 0 && (
                  <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
              </button>
              
              {showAlerts && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <h3 className="font-medium">Notifications</h3>
                    </div>
                    {alerts.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No new notifications
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {alerts.map(async (alert) => {
                          const item = await db.inventory.get(alert.itemId);
                          return (
                            <div key={alert.id} className="px-4 py-2 text-sm text-gray-700 border-b hover:bg-gray-50">
                              <p className="font-medium text-red-600">Low Stock Alert</p>
                              <p>{item?.name || 'Unknown item'} is below minimum quantity</p>
                              <p className="text-xs text-gray-500">{alert.date.toLocaleString()}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* User menu */}
            <div className="relative ml-3" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <User size={18} />
                </div>
                <span className="ml-2 text-gray-700 hidden md:block">{user?.username}</span>
              </button>
              
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <div className="block px-4 py-2 text-sm text-gray-700 border-b">
                      <p className="font-medium">{user?.username}</p>
                      <p className="text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
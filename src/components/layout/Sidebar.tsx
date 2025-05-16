import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Settings, 
  X 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  closeSidebar: () => void;
}

const Sidebar = ({ isOpen, isMobile, closeSidebar }: SidebarProps) => {
  const location = useLocation();
  
  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Inventory', path: '/inventory', icon: <Package size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart3 size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  // If sidebar is closed on mobile, don't render anything
  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-30' : 'relative'} 
          w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        {/* Close button - Mobile only */}
        {isMobile && (
          <button 
            className="absolute top-0 right-0 p-4 text-gray-500 hover:text-gray-900"
            onClick={closeSidebar}
          >
            <X size={20} />
          </button>
        )}
        
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b">
          <h1 className="text-xl font-bold text-blue-600">StockManager</h1>
        </div>
        
        {/* Navigation */}
        <div className="py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={isMobile ? closeSidebar : undefined}
                  className={({ isActive }) => `
                    flex items-center px-6 py-3 text-base font-medium transition-colors duration-200
                    ${isActive 
                      ? 'text-blue-600 bg-blue-50 border-r-4 border-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-0 w-full border-t p-4">
          <div className="flex items-center text-sm text-gray-500">
            <div>
              <p className="font-semibold text-gray-600">StockManager</p>
              <p>v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
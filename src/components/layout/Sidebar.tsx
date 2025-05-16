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
          flex flex-col h-full
        `}
      >
        {/* Close button - Mobile only */}
        {isMobile && (
          <button 
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900"
            onClick={closeSidebar}
          >
            <X size={20} />
          </button>
        )}
        
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b px-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="m7.5 4.27 9 5.15"></path>
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                <path d="m3.3 7 8.7 5 8.7-5"></path>
                <path d="M12 22V12"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-blue-600 truncate">StockManager</h1>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={isMobile ? closeSidebar : undefined}
                  className={({ isActive }) => `
                    flex items-center px-4 py-3 text-base font-medium transition-colors duration-200 rounded-lg
                    ${isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="mr-3 shrink-0">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Footer */}
        <div className="border-t p-4 mt-auto">
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
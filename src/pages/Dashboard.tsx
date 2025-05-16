import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventoryStore } from '../stores/inventoryStore';
import db from '../db/db';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart, 
  Clock 
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  BarElement 
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Transaction, InventoryItem, LowStockAlert } from '../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement, 
  Title, 
  Tooltip, 
  Legend
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { items, fetchItems } = useInventoryStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Stats for charts
  const [categoryData, setCategoryData] = useState<{ labels: string[], data: number[] }>({
    labels: [],
    data: []
  });
  
  const [transactionHistory, setTransactionHistory] = useState<{
    labels: string[],
    stockIn: number[],
    stockOut: number[]
  }>({
    labels: [],
    stockIn: [],
    stockOut: []
  });

  // Helper function to safely get transactions for a date range
  const getTransactionsForDateRange = async (startDate: Date, endDate: Date, type: 'stock-in' | 'stock-out'): Promise<number> => {
    try {
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('Invalid date range detected:', { startDate, endDate });
        return 0;
      }

      const transactions = await db.transactions
        .where('date')
        .between(startDate, endDate)
        .and(t => t.type === type)
        .toArray();
        
      return transactions.reduce((sum, t) => sum + t.quantity, 0);
    } catch (error) {
      console.error('Error fetching transactions for date range:', error);
      return 0;
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        // Fetch inventory items
        await fetchItems();
        
        // Fetch recent transactions
        const recentTransactions = await db.transactions
          .orderBy('date')
          .reverse()
          .limit(10)
          .toArray();
        setTransactions(recentTransactions);
        
        // Fetch low stock alerts
        const alerts = await db.lowStockAlerts
          .where('resolved')
          .equals(false)
          .toArray();
        setLowStockAlerts(alerts);
        
        // Fetch low stock items
        const inventoryItems = await db.inventory.toArray();
        const lowStock = inventoryItems.filter(item => item.quantity <= item.minQuantity);
        setLowStockItems(lowStock);
        
        // Calculate total inventory value
        const total = inventoryItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        setTotalValue(total);
        
        // Prepare category data for charts
        const categories = [...new Set(inventoryItems.map(item => item.category))];
        const categoryCounts = categories.map(category => 
          inventoryItems.filter(item => item.category === category).length
        );
        setCategoryData({
          labels: categories,
          data: categoryCounts
        });
        
        // Prepare transaction history data
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date;
        }).reverse();
        
        const labels = last7Days.map(date => date.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const stockInData = await Promise.all(last7Days.map(async (date) => {
          // Create start and end of day dates
          const startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);
          
          return getTransactionsForDateRange(startDate, endDate, 'stock-in');
        }));
        
        const stockOutData = await Promise.all(last7Days.map(async (date) => {
          // Create start and end of day dates
          const startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          
          const endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);
          
          return getTransactionsForDateRange(startDate, endDate, 'stock-out');
        }));
        
        setTransactionHistory({
          labels,
          stockIn: stockInData,
          stockOut: stockOutData
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Listen for real-time updates
    const handleInventoryUpdate = () => {
      fetchDashboardData();
    };
    
    window.addEventListener('inventory-updated', handleInventoryUpdate);
    window.addEventListener('low-stock-alert', handleInventoryUpdate);
    
    return () => {
      window.removeEventListener('inventory-updated', handleInventoryUpdate);
      window.removeEventListener('low-stock-alert', handleInventoryUpdate);
    };
  }, [fetchItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <button 
          onClick={() => navigate('/inventory')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
        >
          Manage Inventory
        </button>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Package size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{items.length}</p>
            </div>
          </div>
        </div>
        
        {/* Total Value */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <DollarSign size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inventory Value</p>
              <p className="text-2xl font-semibold text-gray-900">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* Low Stock */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900">{lowStockItems.length}</p>
            </div>
          </div>
        </div>
        
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <ShoppingCart size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">{transactions.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction History Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h2>
          <div className="h-64">
            <Line 
              data={{
                labels: transactionHistory.labels,
                datasets: [
                  {
                    label: 'Stock In',
                    data: transactionHistory.stockIn,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.3
                  },
                  {
                    label: 'Stock Out',
                    data: transactionHistory.stockOut,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.3
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>
        
        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Inventory by Category</h2>
          <div className="h-64 flex items-center justify-center">
            {categoryData.labels.length > 0 ? (
              <Doughnut 
                data={{
                  labels: categoryData.labels,
                  datasets: [
                    {
                      data: categoryData.data,
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                      ]
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right'
                    }
                  }
                }}
              />
            ) : (
              <p className="text-gray-500">No category data available</p>
            )}
          </div>
        </div>
        
        {/* Low Stock Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Low Stock Items</h2>
            {lowStockItems.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {lowStockItems.length} items
              </span>
            )}
          </div>
          
          {lowStockItems.length === 0 ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <Package size={24} />
              </div>
              <p className="text-gray-500">All items are sufficiently stocked</p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min. Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.minQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            <button 
              onClick={() => navigate('/reports')}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all
            </button>
          </div>
          
          {transactions.length === 0 ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                <Clock size={24} />
              </div>
              <p className="text-gray-500">No recent transactions</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {transactions.slice(0, 5).map((transaction, index) => (
                  <li key={transaction.id}>
                    <div className="relative pb-8">
                      {index !== 4 && (
                        <span 
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`
                            h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                            ${transaction.type === 'stock-in' ? 'bg-green-100' : 'bg-red-100'}
                          `}>
                            {transaction.type === 'stock-in' ? (
                              <TrendingUp size={16} className="text-green-600" />
                            ) : (
                              <ShoppingCart size={16} className="text-red-600" />
                            )}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-900">
                              {transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out'}: 
                              <span className="font-medium"> {transaction.quantity} units</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              {transaction.notes || 'No notes provided'}
                            </p>
                          </div>
                          <div className="text-right text-xs whitespace-nowrap text-gray-500">
                            {new Date(transaction.date).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
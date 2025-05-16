import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInventoryStore } from "../stores/inventoryStore";
import { transactionService, alertService } from "../services/api";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  Clock,
  DollarSign
} from "lucide-react";
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

interface TransactionData {
  _id: string;
  itemId: {
    _id: string;
    name: string;
  };
  quantity: number;
  type: 'stock-in' | 'stock-out';
  date: string;
  notes?: string;
  createdBy: string;
}

interface DashboardStats {
  totalItems: number;
  lowStock: number;
  stockIn: number;
  stockOut: number;
  totalValue: number;
  recentTransactions: {
    id: string;
    itemName: string;
    type: 'stock-in' | 'stock-out' | 'adjustment';
    quantity: number;
    date: string;
  }[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { items, fetchItems } = useInventoryStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStock: 0,
    stockIn: 0,
    stockOut: 0,
    totalValue: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await fetchItems(1, 1000);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const transactions = await transactionService.getAllTransactions();
        const recentTransactions = transactions.filter(
          (t: TransactionData) => new Date(t.date) >= thirtyDaysAgo
        );

        const stockIn = recentTransactions
          .filter((t: TransactionData) => t.type === "stock-in")
          .reduce((sum: number, t: TransactionData) => sum + t.quantity, 0);

        const stockOut = recentTransactions
          .filter((t: TransactionData) => t.type === "stock-out")
          .reduce((sum: number, t: TransactionData) => sum + t.quantity, 0);

        const lowStockItems = items.filter((item: InventoryItem) => 
          item.quantity <= item.reorderPoint
        );

        const totalValue = items.reduce((sum: number, item: InventoryItem) => 
          sum + (item.quantity * item.unitPrice), 0
        );

        const newStats = {
          totalItems: items.length,
          lowStock: lowStockItems.length,
          stockIn,
          stockOut,
          totalValue,
          recentTransactions: recentTransactions.map((t: TransactionData) => ({
            id: t._id,
            itemName: t.itemId?.name || items.find(i => i._id === t.itemId?._id)?.name || 'Unknown Item',
            type: t.type,
            quantity: t.quantity,
            date: t.date,
          })),
        };
        
        setStats(newStats);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setError("Error loading dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [fetchItems, items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Overview of your inventory and recent activities</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalItems}
                  </p>
                </div>
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.lowStock}
                  </p>
                  <p className="text-xs text-gray-500">Below reorder level</p>
                </div>
              </div>
            </div>

            {/* Stock In */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                  <ArrowUpRight className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stock In (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.stockIn}
                  </p>
                </div>
              </div>
            </div>

            {/* Stock Out */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                  <ArrowDownRight className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Stock Out (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.stockOut}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{stats.totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </div>
              ) : error ? (
                <div className="p-6">
                  <p className="text-red-500 text-center">{error}</p>
                </div>
              ) : stats.recentTransactions.length === 0 ? (
                <div className="p-6">
                  <p className="text-gray-500 text-center">No recent transactions</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.itemName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'stock-in' 
                              ? 'bg-green-100 text-green-800'
                              : transaction.type === 'stock-out'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type === 'stock-in' ? 'Stock In' : 
                             transaction.type === 'stock-out' ? 'Stock Out' : 'Adjustment'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
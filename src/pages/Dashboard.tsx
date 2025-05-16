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

const Dashboard = () => {
  const navigate = useNavigate();
  const { items, fetchItems } = useInventoryStore();
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    stockIn: 0,
    stockOut: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await fetchItems();
        
        // Get transactions for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const transactions = await transactionService.getAllTransactions();
        const recentTransactions = transactions.filter(
          (t) => new Date(t.date) >= thirtyDaysAgo
        );

        // Calculate statistics
        const stockIn = recentTransactions
          .filter((t) => t.type === "stock-in")
          .reduce((sum, t) => sum + t.quantity, 0);

        const stockOut = recentTransactions
          .filter((t) => t.type === "stock-out")
          .reduce((sum, t) => sum + t.quantity, 0);

        const lowStockItems = items.filter(
          (item) => item.quantity <= item.minQuantity
        );

        setStats({
          totalItems: items.length,
          lowStock: lowStockItems.length,
          stockIn,
          stockOut,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    loadDashboardData();
  }, [fetchItems, items]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Package className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.totalItems}
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.lowStock}
              </p>
            </div>
          </div>
        </div>

        {/* Stock In */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stock In (30d)</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.stockIn}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Out */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <ArrowDownRight className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stock Out (30d)</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.stockOut}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <p className="text-gray-500 text-center">
              Recent activity will be displayed here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
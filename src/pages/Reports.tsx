import { useState, useEffect, useRef } from 'react';
import { useReportStore } from '../stores/reportStore';
import { 
  FileText, 
  Filter, 
  Calendar, 
  Download, 
  TrendingUp, 
  ShoppingCart 
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { ReportFilter, Transaction } from '../types';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend
);

const Reports = () => {
  const { 
    transactions, 
    loading, 
    error, 
    fetchTransactions, 
    generateInventoryReport,
    generateTransactionReport,
    exportToCsv 
  } = useReportStore();
  
  const [activeTab, setActiveTab] = useState('transactions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  
  // Fetch transactions on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Set default date range to last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      
      // Fetch transactions with this default date range
      await fetchTransactions({
        startDate: start,
        endDate: end
      });
    };
    
    loadInitialData();
  }, [fetchTransactions]);

  // Apply filters
  const applyFilters = async () => {
    const filter: ReportFilter = {};
    
    if (startDate) {
      filter.startDate = new Date(startDate);
    }
    
    if (endDate) {
      filter.endDate = new Date(endDate);
    }
    
    if (transactionType) {
      filter.transactionType = transactionType as 'stock-in' | 'stock-out';
    }
    
    if (activeTab === 'transactions') {
      await fetchTransactions(filter);
      const report = await generateTransactionReport(filter);
      setReportData(report);
      
      // Prepare chart data
      prepareTransactionChartData(report);
    } else if (activeTab === 'inventory') {
      const report = await generateInventoryReport(filter);
      setReportData(report);
      
      // Prepare chart data
      prepareInventoryChartData(report);
    }
  };

  // Prepare transaction chart data
  const prepareTransactionChartData = (data: any[]) => {
    if (!data.length) {
      setChartData(null);
      return;
    }
    
    // Group by date
    const groupedByDate = data.reduce((acc, transaction) => {
      const date = new Date(transaction.date).toLocaleDateString();
      
      if (!acc[date]) {
        acc[date] = { date, stockIn: 0, stockOut: 0 };
      }
      
      if (transaction.type === 'stock-in') {
        acc[date].stockIn += transaction.quantity;
      } else if (transaction.type === 'stock-out') {
        acc[date].stockOut += transaction.quantity;
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const sortedData = Object.values(groupedByDate).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setChartData({
      labels: sortedData.map((item: any) => item.date),
      datasets: [
        {
          label: 'Stock In',
          data: sortedData.map((item: any) => item.stockIn),
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        },
        {
          label: 'Stock Out',
          data: sortedData.map((item: any) => item.stockOut),
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        }
      ]
    });
  };

  // Prepare inventory chart data
  const prepareInventoryChartData = (data: any[]) => {
    if (!data.length) {
      setChartData(null);
      return;
    }
    
    // Sort by quantity (descending)
    const sortedData = [...data].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    
    setChartData({
      labels: sortedData.map(item => item.name),
      datasets: [
        {
          label: 'Current Quantity',
          data: sortedData.map(item => item.quantity),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        },
        {
          label: 'Minimum Quantity',
          data: sortedData.map(item => item.minQuantity),
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1
        }
      ]
    });
  };

  // Export report to CSV
  const handleExport = () => {
    if (!reportData.length) return;
    
    exportToCsv(
      reportData, 
      `${activeTab}-report-${new Date().toISOString().split('T')[0]}`
    );
  };

  // Effect to apply filters when tab changes
  useEffect(() => {
    applyFilters();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
        {reportData.length > 0 && (
          <button 
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download size={16} className="mr-2" />
            Export CSV
          </button>
        )}
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'transactions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Transaction History
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'inventory'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Inventory Analysis
          </button>
        </nav>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          {activeTab === 'transactions' && (
            <div>
              <label htmlFor="transactionType" className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter size={16} className="text-gray-400" />
                </div>
                <select
                  id="transactionType"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="stock-in">Stock In</option>
                  <option value="stock-out">Stock Out</option>
                </select>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={applyFilters}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Apply Filters
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Chart */}
      {!loading && chartData && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {activeTab === 'transactions' ? 'Transaction Volume' : 'Inventory Levels'}
          </h2>
          <div className="h-80">
            {activeTab === 'transactions' ? (
              <Bar 
                data={chartData}
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
            ) : (
              <Bar 
                data={chartData}
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
            )}
          </div>
        </div>
      )}
      
      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : reportData.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No data available</h3>
          <p className="text-gray-500">
            Try adjusting your filters to see more results
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'transactions' ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
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
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((transaction: any) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.itemName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.itemCategory}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`
                          px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${transaction.type === 'stock-in' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                          }
                        `}>
                          {transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${transaction.totalValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turnover
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Last updated: {new Date(item.updatedAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${item.quantity <= item.minQuantity 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                          }
                        `}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.minQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TrendingUp size={14} className="text-green-500 mr-1" />
                          <span className="text-sm text-gray-900">{item.stockIn}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ShoppingCart size={14} className="text-blue-500 mr-1" />
                          <span className="text-sm text-gray-900">{item.stockOut}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isNaN(item.turnover) ? '-' : item.turnover.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${item.value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
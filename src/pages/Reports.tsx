import { useState, useEffect, useRef } from 'react';
import { useReportStore } from '../stores/reportStore';
import { 
  FileText, 
  Filter, 
  Calendar, 
  Download, 
  TrendingUp, 
  ShoppingCart,
  BarChart3,
  LineChart,
  AlertCircle,
  ChevronDown
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
    exportToCsv,
    clearError 
  } = useReportStore();
  
  const [activeTab, setActiveTab] = useState('transactions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transactionType, setTransactionType] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch transactions on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        
        await fetchTransactions({
          startDate: start,
          endDate: end
        });
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [fetchTransactions]);

  // Apply filters
  const applyFilters = async () => {
    try {
      setIsLoading(true);
      clearError();
      const filter: ReportFilter = {};
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.startDate = start;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.endDate = end;
      }
      
      if (transactionType) {
        filter.transactionType = transactionType as 'stock-in' | 'stock-out';
      }
      
      if (activeTab === 'transactions') {
        await fetchTransactions(filter);
        const report = await generateTransactionReport(filter);
        if (report && report.length > 0) {
          setReportData(report);
          prepareTransactionChartData(report);
        } else {
          setReportData([]);
          setChartData(null);
        }
      } else if (activeTab === 'inventory') {
        const report = await generateInventoryReport(filter);
        if (report && report.length > 0) {
          setReportData(report);
          prepareInventoryChartData(report);
        } else {
          setReportData([]);
          setChartData(null);
        }
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      setReportData([]);
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setReportData([]);
    setChartData(null);
    applyFilters();
  };

  // Prepare transaction chart data
  const prepareTransactionChartData = (data: any[]) => {
    if (!data.length) {
      setChartData(null);
      return;
    }
    
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
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Analyze your inventory and transaction data</p>
                </div>
              </div>
              
              {reportData.length > 0 && (
                <button 
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <Download size={16} className="mr-2" />
                  Export CSV
                </button>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4">
              <nav className="flex space-x-8">
                <button
                  onClick={() => handleTabChange('transactions')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                    ${activeTab === 'transactions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <LineChart size={16} />
                    Transaction History
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('inventory')}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                    ${activeTab === 'inventory'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} />
                    Inventory Analysis
                  </div>
                </button>
              </nav>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-5">
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
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
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
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
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
                        className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none transition-all duration-200"
                      >
                        <option value="">All Types</option>
                        <option value="stock-in">Stock In</option>
                        <option value="stock-out">Stock Out</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ChevronDown size={16} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={applyFilters}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Apply Filters'
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Chart */}
          {!loading && chartData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeTab === 'transactions' ? 'Transaction Volume' : 'Inventory Levels'}
                </h2>
              </div>
              <div className="p-6">
                <div className="h-80">
                  {activeTab === 'transactions' ? (
                    <Bar 
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            }
                          },
                          x: {
                            grid: {
                              display: false
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'top' as const,
                            labels: {
                              usePointStyle: true,
                              padding: 20
                            }
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
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            }
                          },
                          x: {
                            grid: {
                              display: false
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'top' as const,
                            labels: {
                              usePointStyle: true,
                              padding: 20
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Data Table */}
          {reportData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeTab === 'transactions' ? 'Transaction Details' : 'Inventory Details'}
                </h2>
              </div>
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
                        <tr key={transaction.id} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transaction.date).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.itemName || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {transaction.itemCategory || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`
                              px-3 py-1 rounded-full text-xs font-medium
                              ${transaction.type === 'stock-in' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                              }
                            `}>
                              {transaction.type === 'stock-in' ? 'Stock In' : 'Stock Out'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.quantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{transaction.totalValue ? transaction.totalValue.toFixed(2) : '0.00'}
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
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.name || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Last updated: {new Date(item.updatedAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.category || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`
                              px-3 py-1 rounded text-xs font-medium
                              ${item.quantity <= item.minQuantity 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                              }
                            `}>
                              {item.quantity || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.minQuantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <TrendingUp size={14} className="text-green-500 mr-1.5" />
                              <span className="text-sm text-gray-900">{item.stockIn || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ShoppingCart size={14} className="text-blue-500 mr-1.5" />
                              <span className="text-sm text-gray-900">{item.stockOut || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isNaN(item.turnover) ? '-' : item.turnover.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.value ? item.value.toFixed(2) : '0.00'}
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
      </div>
    </div>
  );
};

export default Reports;
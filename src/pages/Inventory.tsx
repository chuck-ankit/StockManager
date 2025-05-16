import { useState, useEffect } from 'react';
import { useInventoryStore } from '../stores/inventoryStore';
import InventoryForm from '../components/inventory/InventoryForm';
import TransactionForm from '../components/inventory/TransactionForm';
import { 
  Plus, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Edit, 
  Trash2, 
  Filter, 
  AlertTriangle 
} from 'lucide-react';
import { InventoryItem } from '../types';

const Inventory = () => {
  const { items, loading, error, fetchItems, deleteItem } = useInventoryStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [showStockOutForm, setShowStockOutForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Get unique categories from items
  useEffect(() => {
    const uniqueCategories = [...new Set(items.map(item => item.category))];
    setCategories(uniqueCategories);
  }, [items]);

  // Fetch items on component mount
  useEffect(() => {
    fetchItems();
    
    // Listen for real-time updates
    const handleInventoryUpdate = () => {
      fetchItems();
    };
    
    window.addEventListener('inventory-updated', handleInventoryUpdate);
    
    return () => {
      window.removeEventListener('inventory-updated', handleInventoryUpdate);
    };
  }, [fetchItems]);

  // Filter items based on search term and category
  useEffect(() => {
    let filtered = [...items];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        item => 
          item.name.toLowerCase().includes(term) || 
          item.description.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term) ||
          item.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    setFilteredItems(filtered);
  }, [items, searchTerm, categoryFilter]);

  // Handle delete item
  const handleDeleteClick = (id: string) => {
    setConfirmDelete(id);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    
    try {
      const success = await deleteItem(confirmDelete);
      
      if (!success) {
        setDeleteError('Failed to delete item. It may have associated transactions.');
      } else {
        setConfirmDelete(null);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      setDeleteError('An error occurred while deleting the item');
    }
  };

  // Handle stock in/out
  const handleStockIn = (id: string) => {
    setSelectedItem(id);
    setShowStockInForm(true);
  };

  const handleStockOut = (id: string) => {
    setSelectedItem(id);
    setShowStockOutForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Inventory Management</h1>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus size={16} className="mr-2" />
            Add New Item
          </button>
        </div>
      </div>
      
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        <div className="relative max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={18} className="text-gray-400" />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {/* Inventory Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No items found</h3>
          <p className="text-gray-500">
            {items.length === 0 
              ? "Your inventory is empty. Let's add some items!" 
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {items.length === 0 && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus size={16} className="mr-2" />
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.quantity <= item.minQuantity ? (
                          <AlertTriangle size={16} className="text-amber-500 mr-1" />
                        ) : null}
                        <span className={`text-sm font-medium ${
                          item.quantity <= item.minQuantity ? 'text-amber-500' : 'text-gray-900'
                        }`}>
                          {item.quantity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${(item.quantity * item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleStockIn(item.id)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Stock In"
                        >
                          <ArrowUpCircle size={18} />
                        </button>
                        <button
                          onClick={() => handleStockOut(item.id)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Stock Out"
                        >
                          <ArrowDownCircle size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl">
            <InventoryForm onClose={() => setShowAddForm(false)} />
          </div>
        </div>
      )}
      
      {/* Stock In Form Modal */}
      {showStockInForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <TransactionForm 
              type="stock-in" 
              itemId={selectedItem || undefined} 
              onClose={() => {
                setShowStockInForm(false);
                setSelectedItem(null);
              }} 
            />
          </div>
        </div>
      )}
      
      {/* Stock Out Form Modal */}
      {showStockOutForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md">
            <TransactionForm 
              type="stock-out" 
              itemId={selectedItem || undefined} 
              onClose={() => {
                setShowStockOutForm(false);
                setSelectedItem(null);
              }} 
            />
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {deleteError}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
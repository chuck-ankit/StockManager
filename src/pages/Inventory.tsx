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
  AlertTriangle,
  Package,
  ChevronDown
} from 'lucide-react';
import { InventoryItem } from '../types';

const Inventory = () => {
  const { items, loading, error, fetchItems, deleteItem, updateItem, addItem } = useInventoryStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [showStockOutForm, setShowStockOutForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [updateError, setUpdateError] = useState('');

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
          (item.tags || []).some(tag => tag.toLowerCase().includes(term))
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
      
      if (success) {
        setConfirmDelete(null);
        setDeleteError('');
        fetchItems(); // Refresh the list after successful deletion
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting the item';
      setDeleteError(errorMessage);
    }
  };

  // Handle edit item
  const handleEditClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowEditForm(true);
  };

  // Handle edit success
  const handleEditSuccess = async (updatedItem: InventoryItem) => {
    try {
      if (!selectedItem?._id) {
        throw new Error('Item ID is required for update');
      }
      
      // Format updates according to server's allowed fields
      const updates = {
        name: updatedItem.name,
        description: updatedItem.description,
        category: updatedItem.category,
        quantity: updatedItem.quantity,
        unitPrice: updatedItem.unitPrice,
        reorderPoint: updatedItem.reorderPoint,
        status: updatedItem.status,
        location: updatedItem.location,
        supplier: updatedItem.supplier,
        lastRestocked: updatedItem.lastRestocked
      };

      const success = await updateItem(selectedItem._id, updates);

      if (success) {
        setShowEditForm(false);
        setSelectedItem(null);
        setUpdateError('');
        fetchItems();
      } else {
        throw new Error('Failed to update item');
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Failed to update item');
    }
  };

  // Handle stock in/out
  const handleStockIn = (id: string) => {
    const item = items.find(item => item._id === id);
    if (item) {
      setSelectedItem(item);
      setShowStockInForm(true);
    }
  };

  const handleStockOut = (id: string) => {
    const item = items.find(item => item._id === id);
    if (item) {
      setSelectedItem(item);
      setShowStockOutForm(true);
    }
  };

  // Handle add success
  const handleAddSuccess = async (newItem: InventoryItem) => {
    try {
      await addItem(newItem);
      setShowAddForm(false);
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Manage your inventory items and stock levels</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <Plus size={16} className="mr-2" />
                Add New Item
              </button>
            </div>
          </div>
          
          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, description, category, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                  />
                </div>
                
                <div className="relative max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Filter size={18} className="text-gray-400" />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="block w-full pl-11 pr-10 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm appearance-none transition-all duration-200"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Error messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          
          {updateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {updateError}
            </div>
          )}
          
          {/* Inventory Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-4">
                <Package size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-500 mb-6">
                {items.length === 0 
                  ? "Your inventory is empty. Let's add some items!" 
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {items.length === 0 && (
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <Plus size={16} className="mr-2" />
                  Add First Item
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {item.name}
                              </div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {item.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.quantity <= item.minQuantity ? (
                              <AlertTriangle size={16} className="text-amber-500 mr-1.5" />
                            ) : null}
                            <span className={`text-sm font-medium ${
                              item.quantity <= item.minQuantity ? 'text-amber-500' : 'text-gray-900'
                            }`}>
                              {item.quantity}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 min-w-[120px]">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 min-w-[120px]">
                          ₹{(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-1">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleStockIn(item._id)}
                              className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors duration-200"
                              title="Stock In"
                            >
                              <ArrowUpCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleStockOut(item._id)}
                              className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Stock Out"
                            >
                              <ArrowDownCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item._id)}
                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors duration-200"
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
          
          {/* Delete confirmation modal */}
          {confirmDelete && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete this item? This action cannot be undone.
                </p>
                {deleteError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                    {deleteError}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Forms */}
          {showAddForm && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-2xl">
                <InventoryForm
                  onClose={() => setShowAddForm(false)}
                  onSuccess={handleAddSuccess}
                />
              </div>
            </div>
          )}
          
          {showEditForm && selectedItem && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-2xl">
                <InventoryForm
                  item={selectedItem}
                  onClose={() => {
                    setShowEditForm(false);
                    setSelectedItem(null);
                  }}
                  onSuccess={handleEditSuccess}
                />
              </div>
            </div>
          )}
          
          {showStockInForm && selectedItem && (
            <TransactionForm
              type="stock-in"
              itemId={selectedItem._id}
              onClose={() => {
                setShowStockInForm(false);
                setSelectedItem(null);
              }}
              onSuccess={() => {
                setShowStockInForm(false);
                setSelectedItem(null);
                fetchItems();
              }}
            />
          )}
          
          {showStockOutForm && selectedItem && (
            <TransactionForm
              type="stock-out"
              itemId={selectedItem._id}
              onClose={() => {
                setShowStockOutForm(false);
                setSelectedItem(null);
              }}
              onSuccess={() => {
                setShowStockOutForm(false);
                setSelectedItem(null);
                fetchItems();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;
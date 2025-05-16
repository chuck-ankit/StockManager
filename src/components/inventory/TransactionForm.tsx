import { useState } from 'react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { X, AlertCircle, ArrowUpCircle, ArrowDownCircle, Package } from 'lucide-react';

interface TransactionFormProps {
  type: 'stock-in' | 'stock-out';
  itemId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ type, itemId, onClose, onSuccess }) => {
  const { items, stockIn, stockOut, loading, error } = useInventoryStore();
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const selectedItem = items.find(item => item._id === itemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!itemId) {
      setFormError('Item ID is required');
      return;
    }

    if (!selectedItem) {
      setFormError('Item not found');
      return;
    }

    if (quantity <= 0) {
      setFormError('Quantity must be greater than 0');
      return;
    }

    if (type === 'stock-out' && selectedItem && quantity > selectedItem.quantity) {
      setFormError('Insufficient stock');
      return;
    }

    try {
      let success;
      if (type === 'stock-in') {
        success = await stockIn(itemId, quantity, notes);
      } else {
        success = await stockOut(itemId, quantity, notes);
      }

      if (success) {
        onSuccess?.();
      } else {
        setFormError(error || 'Failed to process transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process transaction';
      setFormError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                type === 'stock-in' 
                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                  : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }`}>
                {type === 'stock-in' ? (
                  <ArrowUpCircle className="w-5 h-5 text-white" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {type === 'stock-in' ? 'Stock In' : 'Stock Out'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {(error || formError) && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
              Item
            </label>
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {selectedItem?.name}
                </div>
                <div className="text-xs text-gray-500">
                  Current Stock: {selectedItem?.quantity}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
              required
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'stock-in'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                type === 'stock-in' ? 'Stock In' : 'Stock Out'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
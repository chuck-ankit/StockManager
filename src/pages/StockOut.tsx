import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../services/api';
import { CircularProgress, Alert } from '@mui/material';

interface Item {
  _id: string;
  name: string;
  quantity: number;
  category: string;
}

const StockOut = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getItems();
      setItems(response.items);
    } catch (err) {
      setError('Failed to fetch items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || quantity <= 0) {
      setError('Please select an item and enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const item = items.find(i => i._id === selectedItem);
      if (!item) throw new Error('Item not found');

      if (item.quantity < quantity) {
        setError('Insufficient stock available');
        setLoading(false);
        return;
      }

      await inventoryService.updateItem(selectedItem, {
        quantity: item.quantity - quantity,
        stockOut: {
          quantity,
          notes,
          date: new Date().toISOString()
        }
      });

      setSuccess('Stock removed successfully');
      setSelectedItem('');
      setQuantity(0);
      setNotes('');
      fetchItems(); // Refresh the items list
    } catch (err) {
      setError('Failed to remove stock');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !items.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Stock Out</h1>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" className="mb-4">
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Item
            </label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name} (Current Stock: {item.quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Remove
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
              placeholder="Add any notes about this stock out..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircularProgress size={20} className="mr-2" />
                  Processing...
                </>
              ) : (
                'Remove Stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockOut; 
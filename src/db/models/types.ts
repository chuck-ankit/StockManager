export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  lastUpdated: Date;
}

export interface Transaction {
  id: string;
  type: 'purchase' | 'sale';
  itemId: string;
  quantity: number;
  price: number;
  date: Date;
  notes?: string;
} 
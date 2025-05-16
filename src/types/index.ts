// User types
export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // In a real app, this would be hashed
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Inventory types
export interface InventoryItem {
  _id: string;
  id?: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  reorderPoint: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  tags?: string[];
  location?: string;
  supplier?: string;
  lastRestocked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  itemId: string;
  quantity: number;
  type: 'stock-in' | 'stock-out' | 'adjustment';
  date: Date;
  notes?: string;
  createdBy: string;
}

export interface LowStockAlert {
  id: string;
  itemId: string;
  date: Date;
  resolved: boolean;
}

// Dashboard types
export interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  recentTransactions: Transaction[];
}

// Report types
export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  itemId?: string;
  transactionType?: 'stock-in' | 'stock-out' | 'adjustment';
}

// Utility types
export type SortDirection = 'asc' | 'desc';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
import { create } from 'zustand';
import { reportService } from '../services/api';
import { ReportFilter } from '../types';

interface ReportState {
  transactions: any[];
  loading: boolean;
  error: string | null;
  fetchTransactions: (filter?: ReportFilter) => Promise<void>;
  generateInventoryReport: (filter?: ReportFilter) => Promise<any[]>;
  generateTransactionReport: (filter?: ReportFilter) => Promise<any[]>;
  exportToCsv: (data: any[], filename: string) => void;
  clearError: () => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async (filter?: ReportFilter) => {
    try {
      set({ loading: true, error: null });
      const transactions = await reportService.getTransactions(filter);
      set({ transactions, loading: false });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch transactions', loading: false });
    }
  },

  generateInventoryReport: async (filter?: ReportFilter) => {
    try {
      set({ loading: true, error: null });
      const report = await reportService.generateInventoryReport(filter);
      set({ loading: false });
      return report;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to generate inventory report', loading: false });
      return [];
    }
  },

  generateTransactionReport: async (filter?: ReportFilter) => {
    try {
      set({ loading: true, error: null });
      const report = await reportService.generateTransactionReport(filter);
      set({ loading: false });
      return report;
    } catch (error) {
      console.error('Error generating transaction report:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to generate transaction report', loading: false });
      return [];
    }
  },

  exportToCsv: (data: any[], filename: string) => {
    try {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header]).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      set({ error: 'Failed to export report to CSV' });
    }
  },

  clearError: () => set({ error: null })
}));
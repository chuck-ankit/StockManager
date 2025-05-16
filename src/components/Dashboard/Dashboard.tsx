import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { inventoryService } from '../../services/api';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download as DownloadIcon } from '@mui/icons-material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventoryStats, setInventoryStats] = useState<any>(null);
  const [layout, setLayout] = useState<'default' | 'compact' | 'detailed'>('default');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [items, outOfStock] = await Promise.all([
          inventoryService.getItems(),
          inventoryService.getOutOfStockItems()
        ]);

        // Calculate statistics
        const stats = {
          totalItems: items.total,
          outOfStock: outOfStock.length,
          lowStock: items.items.filter((item: any) => item.status === 'low_stock').length,
          categories: items.items.reduce((acc: any, item: any) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
          }, {}),
          stockValue: items.items.reduce((acc: any, item: any) => {
            return acc + (item.quantity * item.unitPrice);
          }, 0)
        };

        setInventoryStats(stats);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleExport = async () => {
    try {
      const blob = await inventoryService.exportReport('csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory-report.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const categoryData = Object.entries(inventoryStats.categories).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Box>
          <FormControl sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel>Layout</InputLabel>
            <Select
              value={layout}
              label="Layout"
              onChange={(e) => setLayout(e.target.value as any)}
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="compact">Compact</MenuItem>
              <MenuItem value="detailed">Detailed</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Items
              </Typography>
              <Typography variant="h4">
                {inventoryStats.totalItems}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Out of Stock
              </Typography>
              <Typography variant="h4" color="error">
                {inventoryStats.outOfStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Low Stock Items
              </Typography>
              <Typography variant="h4" color="warning.main">
                {inventoryStats.lowStock}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Stock Value
              </Typography>
              <Typography variant="h4" color="success.main">
                ${inventoryStats.stockValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Items by Category
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Stock Status Distribution
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'In Stock', value: inventoryStats.totalItems - inventoryStats.outOfStock - inventoryStats.lowStock },
                      { name: 'Low Stock', value: inventoryStats.lowStock },
                      { name: 'Out of Stock', value: inventoryStats.outOfStock }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 
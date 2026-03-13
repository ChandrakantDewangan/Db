import { Dataset, Column } from '../types';

const inferType = (value: any): 'string' | 'number' | 'boolean' | 'date' => {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    if (!isNaN(Date.parse(value)) && value.includes('-')) return 'date';
    return 'string';
  }
  return 'string';
};

const createDataset = (id: string, name: string, data: any[]): Dataset => {
  const firstRow = data[0];
  const columns: Column[] = Object.keys(firstRow).map(key => ({
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    type: inferType(firstRow[key]),
    visible: true,
  }));

  return {
    id,
    name,
    sourceAgent: 'System Initializer',
    timestamp: Date.now(),
    data,
    columns,
  };
};

export const DUMMY_DATASETS: Dataset[] = [
  createDataset('ds1', 'Global Sales 2023', [
    { id: 1, region: 'North America', category: 'Electronics', sales: 45000, profit: 12000, date: '2023-01-15', managerId: 'M1' },
    { id: 2, region: 'Europe', category: 'Electronics', sales: 38000, profit: 9500, date: '2023-01-20', managerId: 'M2' },
    { id: 3, region: 'Asia', category: 'Electronics', sales: 52000, profit: 15000, date: '2023-02-05', managerId: 'M3' },
    { id: 4, region: 'North America', category: 'Furniture', sales: 28000, profit: 4000, date: '2023-02-12', managerId: 'M1' },
    { id: 5, region: 'Europe', category: 'Furniture', sales: 31000, profit: 5500, date: '2023-03-01', managerId: 'M2' },
    { id: 6, region: 'Asia', category: 'Furniture', sales: 25000, profit: 3000, date: '2023-03-15', managerId: 'M3' },
  ]),
  createDataset('ds2', 'Managers', [
    { managerId: 'M1', name: 'Alice Johnson', department: 'Sales', performance: 92 },
    { managerId: 'M2', name: 'Bob Smith', department: 'Sales', performance: 88 },
    { managerId: 'M3', name: 'Charlie Davis', department: 'Sales', performance: 95 },
  ]),
  createDataset('ds3', 'Inventory Status', [
    { sku: 'SKU-001', product: 'Laptop Pro', stock: 45, reorderLevel: 10, unitPrice: 1200 },
    { sku: 'SKU-002', product: 'Wireless Mouse', stock: 120, reorderLevel: 30, unitPrice: 25 },
    { sku: 'SKU-003', product: 'Mechanical Keyboard', stock: 8, reorderLevel: 15, unitPrice: 85 },
  ])
];

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
    { id: 1, region: 'North America', category: 'Electronics', sales: 45000, profit: 12000, date: '2023-01-15' },
    { id: 2, region: 'Europe', category: 'Electronics', sales: 38000, profit: 9500, date: '2023-01-20' },
    { id: 3, region: 'Asia', category: 'Electronics', sales: 52000, profit: 15000, date: '2023-02-05' },
    { id: 4, region: 'North America', category: 'Furniture', sales: 28000, profit: 4000, date: '2023-02-12' },
    { id: 5, region: 'Europe', category: 'Furniture', sales: 31000, profit: 5500, date: '2023-03-01' },
    { id: 6, region: 'Asia', category: 'Furniture', sales: 25000, profit: 3000, date: '2023-03-15' },
    { id: 7, region: 'North America', category: 'Office Supplies', sales: 15000, profit: 6000, date: '2023-04-10' },
    { id: 8, region: 'Europe', category: 'Office Supplies', sales: 18000, profit: 7500, date: '2023-04-22' },
    { id: 9, region: 'Asia', category: 'Office Supplies', sales: 22000, profit: 9000, date: '2023-05-05' },
  ]),
  createDataset('ds2', 'User Engagement', [
    { userId: 'U101', activeMinutes: 120, sessions: 5, retention: true, country: 'USA' },
    { userId: 'U102', activeMinutes: 45, sessions: 2, retention: false, country: 'UK' },
    { userId: 'U103', activeMinutes: 300, sessions: 12, retention: true, country: 'Canada' },
    { userId: 'U104', activeMinutes: 15, sessions: 1, retention: false, country: 'Germany' },
    { userId: 'U105', activeMinutes: 80, sessions: 4, retention: true, country: 'France' },
    { userId: 'U106', activeMinutes: 210, sessions: 8, retention: true, country: 'Japan' },
    { userId: 'U107', activeMinutes: 5, sessions: 1, retention: false, country: 'Brazil' },
  ]),
  createDataset('ds3', 'Inventory Status', [
    { sku: 'SKU-001', product: 'Laptop Pro', stock: 45, reorderLevel: 10, unitPrice: 1200 },
    { sku: 'SKU-002', product: 'Wireless Mouse', stock: 120, reorderLevel: 30, unitPrice: 25 },
    { sku: 'SKU-003', product: 'Mechanical Keyboard', stock: 8, reorderLevel: 15, unitPrice: 85 },
    { sku: 'SKU-004', product: 'USB-C Hub', stock: 65, reorderLevel: 20, unitPrice: 45 },
    { sku: 'SKU-005', product: 'Monitor 27"', stock: 12, reorderLevel: 5, unitPrice: 350 },
  ])
];

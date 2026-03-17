import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import alasql from 'alasql';
import { 
  LayoutDashboard, Table as TableIcon, BarChart3, Settings2, Filter, 
  ChevronDown, ChevronUp, Trash2, Edit3, Download, Plus, GitMerge,
  GripVertical, Type as TypeIcon, Hash, Calendar, CheckCircle2, Search,
  Calculator, AlertCircle, Terminal, Play, RotateCcw,
  Columns as ColumnsIcon, Rows as RowsIcon, Palette, Maximize2, Type,
  Info, BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, 
  ScatterChart as ScatterChartIcon, AreaChart as AreaChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AgGridReact } from 'ag-grid-react';
import { 
  ModuleRegistry, 
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CustomFilterModule,
  PaginationModule,
  ExternalFilterModule
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Register AG Grid modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CustomFilterModule,
  PaginationModule,
  ExternalFilterModule
]);

import { Dataset, Column, Visualization, ChartType, Join, DataType } from '../types';
import { cn } from '../lib/utils';

const COLORS = ['#141414', '#F27D26', '#00FF00', '#FF4444', '#4444FF', '#FF00FF'];

interface AnalyticsViewProps {
  datasets: Dataset[];
  onUpdateDataset: (dataset: Dataset) => void;
  onRemoveDataset: (id: string) => void;
}

export default function AnalyticsView({ datasets, onUpdateDataset, onRemoveDataset }: AnalyticsViewProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'visualize' | 'joins' | 'schema' | 'query'>('data');
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [joins, setJoins] = useState<Join[]>([]);
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM ?');
  const [queryError, setQueryError] = useState<string | null>(null);
  const gridRef = useRef<AgGridReact>(null);
  
  // Initialize selectedSourceId
  React.useEffect(() => {
    if (!selectedSourceId && datasets.length > 0) {
      setSelectedSourceId(datasets[0].id);
    }
  }, [datasets, selectedSourceId]);

  // Join Builder State
  const [newJoin, setNewJoin] = useState<Partial<Join>>({
    name: 'New Join',
    type: 'inner',
    leftDatasetId: '',
    rightDatasetId: '',
    leftColumn: '',
    rightColumn: ''
  });

  const selectedDataset = datasets.find(d => d.id === selectedSourceId);
  const selectedJoin = joins.find(j => j.id === selectedSourceId);

  // Compute joined data if a join is selected
  const sourceData = useMemo(() => {
    let baseData: any[] = [];
    let currentColumns: Column[] = [];

    if (selectedDataset) {
      baseData = selectedDataset.data;
      currentColumns = selectedDataset.columns;
    } else if (selectedJoin) {
      const leftDs = datasets.find(d => d.id === selectedJoin.leftDatasetId);
      const rightDs = datasets.find(d => d.id === selectedJoin.rightDatasetId);
      if (leftDs && rightDs) {
        baseData = leftDs.data.map(leftRow => {
          const match = rightDs.data.find(rightRow => 
            String(leftRow[selectedJoin.leftColumn]) === String(rightRow[selectedJoin.rightColumn])
          );
          if (selectedJoin.type === 'inner' && !match) return null;
          
          // Prefix right columns to avoid collisions
          const prefixedRight = Object.keys(match || {}).reduce((acc, key) => {
            acc[`joined_${key}`] = (match as any)[key];
            return acc;
          }, {} as any);

          return { ...leftRow, ...prefixedRight };
        }).filter(Boolean);

        // Construct virtual columns for join
        currentColumns = [...leftDs.columns];
        rightDs.columns.forEach(col => {
          if (!currentColumns.find(c => c.key === col.key)) {
            currentColumns.push({ ...col, key: `joined_${col.key}` });
          }
        });
      }
    }

    // Apply formulas
    const colsWithFormulas = currentColumns.filter(c => c.formula);
    if (colsWithFormulas.length === 0) return baseData;

    return baseData.map(row => {
      const newRow = { ...row };
      colsWithFormulas.forEach(col => {
        try {
          let formula = col.formula || '';
          const colMap = currentColumns.reduce((acc, c) => {
            acc[c.name] = row[c.key];
            return acc;
          }, {} as Record<string, any>);

          Object.keys(colMap).forEach(name => {
            const val = colMap[name];
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\[${escapedName}\\]`, 'g');
            formula = formula.replace(regex, typeof val === 'string' ? `"${val}"` : val);
          });

          // eslint-disable-next-line no-new-func
          const result = new Function(`return ${formula}`)();
          newRow[col.key] = result;
        } catch (e) {
          newRow[col.key] = '#ERROR!';
        }
      });
      return newRow;
    });
  }, [selectedDataset, selectedJoin, datasets]);

  // Apply SQL query if active
  const finalData = useMemo(() => {
    if (activeTab !== 'query' || !sqlQuery.trim()) return sourceData;
    try {
      setQueryError(null);
      // alasql expects data as an array of objects
      // The '?' in the query refers to the first argument after the query string
      const result = alasql(sqlQuery, [sourceData]);
      return Array.isArray(result) ? result : [result];
    } catch (e: any) {
      setQueryError(e.message || 'Invalid SQL query');
      return sourceData;
    }
  }, [sourceData, sqlQuery, activeTab]);

  const sourceColumns = useMemo(() => {
    if (selectedDataset) return selectedDataset.columns;
    if (selectedJoin) {
      const leftDs = datasets.find(d => d.id === selectedJoin.leftDatasetId);
      const rightDs = datasets.find(d => d.id === selectedJoin.rightDatasetId);
      if (!leftDs || !rightDs) return [];
      
      const cols = [...leftDs.columns];
      rightDs.columns.forEach(col => {
        if (!cols.find(c => c.key === col.key)) {
          cols.push({ ...col, key: `joined_${col.key}` });
        }
      });
      return cols;
    }
    return [];
  }, [selectedDataset, selectedJoin, datasets]);

  // AG Grid Column Definitions
  const columnDefs = useMemo(() => {
    const dataToUse = activeTab === 'query' ? finalData : sourceData;
    if (activeTab === 'query' && dataToUse.length > 0) {
      // Auto-generate columns for query results
      const firstRow = dataToUse[0];
      return Object.keys(firstRow).map(key => ({
        field: key,
        headerName: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
        minWidth: 120,
      }));
    }

    return sourceColumns.filter(c => c.visible).map(col => ({
      field: col.key,
      headerName: col.name,
      sortable: true,
      filter: true,
      editable: !!selectedDataset && !col.formula, // Only allow editing base columns, not formulas
      resizable: true,
      flex: 1,
      minWidth: 120,
      valueParser: (params: any) => {
        if (col.type === 'number') return Number(params.newValue);
        if (col.type === 'boolean') return params.newValue === 'true' || params.newValue === true;
        return params.newValue;
      }
    }));
  }, [sourceColumns, selectedDataset]);

  // Visualization Builder State (Tableau Style)
  const [vizShelves, setVizShelves] = useState<{
    columns: string[];
    rows: string[];
    color: string | null;
    size: string | null;
    label: string | null;
  }>({
    columns: [],
    rows: [],
    color: null,
    size: null,
    label: null
  });
  const [vizType, setVizType] = useState<ChartType>('bar');
  const [vizTitle, setVizTitle] = useState('Untitled Visualization');

  // Categorize columns
  const dimensions = useMemo(() => sourceColumns.filter(c => c.type !== 'number'), [sourceColumns]);
  const measures = useMemo(() => sourceColumns.filter(c => c.type === 'number'), [sourceColumns]);

  // Aggregation Logic
  const aggregatedData = useMemo(() => {
    if (vizShelves.columns.length === 0 && vizShelves.rows.length === 0) return [];

    try {
      const dims = vizShelves.columns.filter(k => dimensions.find(d => d.key === k));
      const meass = vizShelves.rows.filter(k => measures.find(m => m.key === k));
      
      if (dims.length === 0 && meass.length > 0) {
        // Just total aggregation
        const result: any = { name: 'Total' };
        meass.forEach(m => {
          result[m] = sourceData.reduce((acc, row) => acc + (Number(row[m]) || 0), 0);
        });
        return [result];
      }

      if (dims.length > 0) {
        const groups: Record<string, any> = {};
        sourceData.forEach(row => {
          const groupKey = dims.map(d => row[d]).join(' - ');
          if (!groups[groupKey]) {
            groups[groupKey] = { name: groupKey };
            dims.forEach(d => groups[groupKey][d] = row[d]);
            meass.forEach(m => groups[groupKey][m] = 0);
          }
          meass.forEach(m => {
            groups[groupKey][m] += (Number(row[m]) || 0);
          });
        });
        return Object.values(groups);
      }
    } catch (e) {
      console.error("Aggregation error", e);
    }
    return sourceData;
  }, [sourceData, vizShelves, dimensions, measures]);

  const addToShelf = (shelf: keyof typeof vizShelves, colKey: string) => {
    setVizShelves(prev => {
      if (shelf === 'columns' || shelf === 'rows') {
        if ((prev[shelf] as string[]).includes(colKey)) return prev;
        return { ...prev, [shelf]: [...(prev[shelf] as string[]), colKey] };
      }
      return { ...prev, [shelf]: colKey };
    });
  };

  const removeFromShelf = (shelf: keyof typeof vizShelves, colKey?: string) => {
    setVizShelves(prev => {
      if (shelf === 'columns' || shelf === 'rows') {
        return { ...prev, [shelf]: (prev[shelf] as string[]).filter(k => k !== colKey) };
      }
      return { ...prev, [shelf]: null };
    });
  };

  const clearShelves = () => {
    setVizShelves({
      columns: [],
      rows: [],
      color: null,
      size: null,
      label: null
    });
  };

  // Global Filter State
  const [filterText, setFilterText] = useState('');

  const onCellValueChanged = useCallback((event: any) => {
    if (!selectedDataset) return;
    const updatedData = [...selectedDataset.data];
    const rowIndex = event.node.rowIndex;
    updatedData[rowIndex] = { ...event.data };
    onUpdateDataset({ ...selectedDataset, data: updatedData });
  }, [selectedDataset, onUpdateDataset]);

  const handleTypeChange = (colKey: string, newType: DataType) => {
    const convertValue = (val: any, type: DataType) => {
      if (val === null || val === undefined || val === '') return val;
      if (type === 'number') {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      }
      if (type === 'boolean') {
        return String(val).toLowerCase() === 'true' || val === 1 || val === true;
      }
      if (type === 'date') {
        try {
          const d = new Date(val);
          return isNaN(d.getTime()) ? val : d.toISOString();
        } catch {
          return val;
        }
      }
      return String(val);
    };

    if (selectedDataset) {
      const updatedColumns = selectedDataset.columns.map(col => 
        col.key === colKey ? { ...col, type: newType } : col
      );
      const updatedData = selectedDataset.data.map(row => ({
        ...row,
        [colKey]: convertValue(row[colKey], newType)
      }));
      onUpdateDataset({ ...selectedDataset, columns: updatedColumns, data: updatedData });
    } else if (selectedJoin) {
      const leftDs = datasets.find(d => d.id === selectedJoin.leftDatasetId);
      const rightDs = datasets.find(d => d.id === selectedJoin.rightDatasetId);
      
      if (leftDs && leftDs.columns.find(c => c.key === colKey)) {
        const updatedColumns = leftDs.columns.map(col => 
          col.key === colKey ? { ...col, type: newType } : col
        );
        const updatedData = leftDs.data.map(row => ({
          ...row,
          [colKey]: convertValue(row[colKey], newType)
        }));
        onUpdateDataset({ ...leftDs, columns: updatedColumns, data: updatedData });
      } else if (rightDs) {
        const baseKey = colKey.replace('joined_', '');
        if (rightDs.columns.find(c => c.key === baseKey)) {
          const updatedColumns = rightDs.columns.map(col => 
            col.key === baseKey ? { ...col, type: newType } : col
          );
          const updatedData = rightDs.data.map(row => ({
            ...row,
            [baseKey]: convertValue(row[baseKey], newType)
          }));
          onUpdateDataset({ ...rightDs, columns: updatedColumns, data: updatedData });
        }
      }
    }
  };

  const toggleColumnVisibility = (colKey: string) => {
    if (!selectedDataset) return;
    const updatedColumns = selectedDataset.columns.map(col => 
      col.key === colKey ? { ...col, visible: !col.visible } : col
    );
    onUpdateDataset({ ...selectedDataset, columns: updatedColumns });
  };

  const handleAddCalculatedColumn = () => {
    if (!selectedDataset) return;
    const newCol: Column = {
      key: `calc_${Date.now()}`,
      name: 'New Column',
      type: 'number',
      visible: true,
      formula: '0'
    };
    onUpdateDataset({
      ...selectedDataset,
      columns: [...selectedDataset.columns, newCol]
    });
  };

  const updateColumnFormula = (colKey: string, formula: string) => {
    if (!selectedDataset) return;
    const updatedColumns = selectedDataset.columns.map(col => 
      col.key === colKey ? { ...col, formula } : col
    );
    onUpdateDataset({ ...selectedDataset, columns: updatedColumns });
  };

  const removeColumn = (colKey: string) => {
    if (!selectedDataset) return;
    // If it's a calculated column (has a formula and was added), we might want to remove it.
    // But wait, the user wants formulas in ANY column. 
    // Let's define "calculated columns" as those that were added via "Add Calculated Column".
    // Base columns should never be removed from the schema manager, only hidden.
    
    // Actually, let's just keep the current behavior for "Add Calculated Column" columns 
    // but for base columns, we just clear the formula.
    
    const col = selectedDataset.columns.find(c => c.key === colKey);
    if (col && col.key.startsWith('calc_')) {
      const updatedColumns = selectedDataset.columns.filter(c => c.key !== colKey);
      onUpdateDataset({ ...selectedDataset, columns: updatedColumns });
    } else {
      // It's a base column, just clear the formula
      updateColumnFormula(colKey, '');
    }
  };

  const handleAddJoin = () => {
    if (!newJoin.leftDatasetId || !newJoin.rightDatasetId || !newJoin.leftColumn || !newJoin.rightColumn) return;
    const join: Join = {
      id: `join-${Date.now()}`,
      name: newJoin.name || 'New Join',
      leftDatasetId: newJoin.leftDatasetId,
      rightDatasetId: newJoin.rightDatasetId,
      leftColumn: newJoin.leftColumn,
      rightColumn: newJoin.rightColumn,
      type: newJoin.type as 'inner' | 'left'
    };
    setJoins(prev => [...prev, join]);
    setSelectedSourceId(join.id);
    setActiveTab('data');
  };

  const handleAddVisualization = () => {
    if (!selectedSourceId) return;
    
    const viz: Visualization = {
      id: Date.now().toString(),
      datasetId: selectedSourceId,
      type: vizType,
      title: vizTitle || 'Untitled Visualization',
      shelves: { ...vizShelves }
    };

    setVisualizations(prev => [...prev, viz]);
  };

  const renderChart = (viz: Visualization, isPreview = false) => {
    const data = isPreview ? aggregatedData : sourceData; // In a real app, we'd store aggregated data or re-aggregate
    const shelves = viz.shelves;
    
    if (data.length === 0) return (
      <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-2">
        <BarChart3 size={48} className="opacity-20" />
        <p className="text-sm font-medium">Drag dimensions and measures to start</p>
      </div>
    );

    const xAxisKey = shelves.columns[0] || 'name';
    const yAxisKey = shelves.rows[0];

    const commonProps = {
      data: data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (viz.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#78716c' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#78716c' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                cursor={{ fill: '#f5f5f4' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
              <Bar 
                dataKey={yAxisKey} 
                fill={shelves.color ? COLORS[0] : "#2563eb"} 
                radius={[4, 4, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend verticalAlign="top" align="right" />
              <Line type="monotone" dataKey={yAxisKey} stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey={yAxisKey} stroke="#2563eb" fill="#3b82f6" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey={yAxisKey}
                nameKey={xAxisKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey={xAxisKey} name={xAxisKey} axisLine={false} tickLine={false} />
              <YAxis type="number" dataKey={yAxisKey} name={yAxisKey} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Data" data={data} fill="#2563eb" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-stone-50 text-stone-400 p-8 text-center">
        <LayoutDashboard size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-semibold text-stone-600 mb-2">No Datasets Available</h2>
        <p className="max-w-md text-sm">
          Please add some datasets to start your analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-stone-200 flex flex-col bg-stone-50">
        <div className="p-4 border-b border-stone-200">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Sources</h3>
          <div className="space-y-1">
            {datasets.map(ds => (
              <button
                key={ds.id}
                onClick={() => setSelectedSourceId(ds.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-all",
                  selectedSourceId === ds.id 
                    ? "bg-stone-900 text-white shadow-md" 
                    : "text-stone-600 hover:bg-stone-200"
                )}
              >
                <span className="truncate flex-1">{ds.name}</span>
                <Trash2 
                  size={14} 
                  className={cn(
                    "opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity",
                    selectedSourceId === ds.id && "text-white/50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDataset(ds.id);
                  }}
                />
              </button>
            ))}
            {joins.map(join => (
              <button
                key={join.id}
                onClick={() => setSelectedSourceId(join.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-all",
                  selectedSourceId === join.id 
                    ? "bg-stone-900 text-white shadow-md" 
                    : "text-stone-600 hover:bg-stone-200"
                )}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  <GitMerge size={14} className="text-stone-400" />
                  <span className="truncate">{join.name}</span>
                </div>
                <Trash2 
                  size={14} 
                  className={cn(
                    "opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity",
                    selectedSourceId === join.id && "text-white/50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setJoins(prev => prev.filter(j => j.id !== join.id));
                    if (selectedSourceId === join.id) setSelectedSourceId(datasets[0].id);
                  }}
                />
              </button>
            ))}
          </div>
        </div>
        
        {selectedDataset && (
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Columns</h3>
            <div className="space-y-2">
              {sourceColumns.map(col => (
                <div key={col.key} className="flex items-center justify-between gap-2 group">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input 
                      type="checkbox" 
                      checked={col.visible} 
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                    />
                    <span className={cn(
                      "text-xs font-medium transition-colors truncate",
                      col.visible ? "text-stone-700" : "text-stone-400"
                    )}>
                      {col.name}
                    </span>
                  </label>
                  <select 
                    value={col.type}
                    onChange={(e) => handleTypeChange(col.key, e.target.value as DataType)}
                    className="text-[10px] bg-stone-100 border-none rounded px-1 py-0.5 text-stone-500 outline-none cursor-pointer hover:bg-stone-200 transition-colors"
                  >
                    <option value="string">ABC</option>
                    <option value="number">123</option>
                    <option value="date">DATE</option>
                    <option value="boolean">BOOL</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Tabs */}
        <div className="px-6 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('data')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                activeTab === 'data' ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
              )}
            >
              <TableIcon size={16} />
              Data Workspace
            </button>
            <button 
              onClick={() => setActiveTab('visualize')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                activeTab === 'visualize' ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
              )}
            >
              <BarChart3 size={16} />
              Visualizations
            </button>
            <button 
              onClick={() => setActiveTab('schema')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                activeTab === 'schema' ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
              )}
            >
              <Settings2 size={16} />
              Schema Manager
            </button>
            <button 
              onClick={() => setActiveTab('joins')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                activeTab === 'joins' ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
              )}
            >
              <GitMerge size={16} />
              Join Tables
            </button>
            <button 
              onClick={() => setActiveTab('query')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                activeTab === 'query' ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
              )}
            >
              <Terminal size={16} />
              SQL Query
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input 
                type="text" 
                placeholder="Filter data..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-stone-100 border-none rounded-full text-xs focus:ring-1 focus:ring-stone-900 outline-none w-48"
              />
            </div>
          </div>
        </div>

        {/* Workspace Area */}
        <div className={cn("flex-1 p-6 bg-stone-50/50", (activeTab !== 'data' && activeTab !== 'schema' && activeTab !== 'query' && activeTab !== 'visualize') && "overflow-y-auto")}>
          {(activeTab === 'data' || activeTab === 'query') ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden h-full flex flex-col">
              {activeTab === 'query' && (
                <div className="p-4 border-b border-stone-200 bg-stone-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest">
                      <Terminal size={14} />
                      SQL Editor
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSqlQuery('SELECT * FROM ?')}
                        className="text-[10px] flex items-center gap-1 text-stone-500 hover:text-stone-900 transition-colors"
                      >
                        <RotateCcw size={10} />
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      className="w-full h-24 p-3 font-mono text-sm bg-stone-900 text-emerald-400 rounded-xl border-none focus:ring-2 focus:ring-emerald-500/50 resize-none outline-none"
                      placeholder="SELECT * FROM ?"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      {queryError && (
                        <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-2 py-1 rounded-md border border-red-400/20">
                          <AlertCircle size={10} />
                          {queryError}
                        </div>
                      )}
                      <div className="text-[10px] text-stone-500 italic">
                        Use <b>?</b> to refer to current dataset
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="ag-theme-alpine w-full flex-1">
                <AgGridReact
                  ref={gridRef}
                  rowData={finalData}
                  columnDefs={columnDefs}
                  defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true,
                  }}
                  onCellValueChanged={onCellValueChanged}
                  quickFilterText={filterText}
                  pagination={true}
                  paginationPageSize={20}
                  animateRows={true}
                  rowSelection="multiple"
                  suppressRowClickSelection={true}
                  enableCellTextSelection={true}
                />
              </div>
            </div>
          ) : activeTab === 'schema' ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="p-6 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Schema Manager</h2>
                  <p className="text-sm text-stone-500">Manage column names, data types, and custom formulas.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                    <AlertCircle size={12} />
                    <span>Use <b>[Column Name]</b> to reference other columns. Basic JavaScript math supported.</span>
                  </div>
                  {selectedDataset && (
                    <button 
                      onClick={handleAddCalculatedColumn}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all shadow-sm"
                    >
                      <Calculator size={16} />
                      Add Calculated Column
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sourceColumns.map(col => (
                    <div key={col.key} className="p-4 rounded-xl border border-stone-200 bg-white shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500">
                            {col.formula ? <Calculator size={16} className="text-indigo-500" /> : 
                             col.type === 'number' ? <Hash size={16} /> : 
                             col.type === 'date' ? <Calendar size={16} /> : 
                             col.type === 'boolean' ? <CheckCircle2 size={16} /> : 
                             <TypeIcon size={16} />}
                          </div>
                          <input 
                            type="text"
                            value={col.name}
                            onChange={(e) => {
                              if (!selectedDataset) return;
                              const updatedColumns = selectedDataset.columns.map(c => 
                                c.key === col.key ? { ...c, name: e.target.value } : c
                              );
                              onUpdateDataset({ ...selectedDataset, columns: updatedColumns });
                            }}
                            className="font-bold text-sm text-stone-900 bg-transparent border-none p-0 focus:ring-0 w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {col.key.startsWith('calc_') ? (
                            <button 
                              onClick={() => removeColumn(col.key)}
                              className="text-stone-300 hover:text-red-500 transition-colors"
                              title="Remove calculated column"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : col.formula ? (
                            <button 
                              onClick={() => updateColumnFormula(col.key, '')}
                              className="text-stone-300 hover:text-amber-500 transition-colors"
                              title="Clear formula"
                            >
                              <RotateCcw size={14} />
                            </button>
                          ) : null}
                          <input 
                            type="checkbox" 
                            checked={col.visible} 
                            onChange={() => toggleColumnVisibility(col.key)}
                            className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Data Type</label>
                          <select 
                            value={col.type}
                            onChange={(e) => handleTypeChange(col.key, e.target.value as DataType)}
                            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700 outline-none focus:ring-1 focus:ring-stone-900 transition-all"
                          >
                            <option value="string">String (ABC)</option>
                            <option value="number">Number (123)</option>
                            <option value="date">Date (YYYY-MM-DD)</option>
                            <option value="boolean">Boolean (True/False)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                            Formula
                            <span className="text-[9px] lowercase font-normal italic">e.g. [Price] * 1.2</span>
                          </label>
                          <div className="relative">
                            <input 
                              type="text"
                              value={col.formula || ''}
                              onChange={(e) => updateColumnFormula(col.key, e.target.value)}
                              className={cn(
                                "w-full text-xs font-mono rounded-lg px-3 py-2 outline-none focus:ring-1 transition-all",
                                col.formula 
                                  ? "bg-indigo-50/30 border border-indigo-100 text-indigo-700 focus:ring-indigo-500" 
                                  : "bg-stone-50 border border-stone-200 text-stone-700 focus:ring-stone-900"
                              )}
                              placeholder="Enter formula to override data..."
                            />
                          </div>
                        </div>
                        
                        <div className="pt-2 flex items-center justify-between text-[10px] text-stone-400 italic">
                          <span>Key: {col.key}</span>
                          {!col.visible && <span className="text-red-400 font-medium not-italic">Hidden</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'visualize' ? (
            <div className="flex h-full gap-6 overflow-hidden">
              {/* Tableau-style Data Pane */}
              <div className="w-64 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-stone-50/50">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Data Pane</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Dimensions */}
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1 h-3 bg-blue-500 rounded-full" />
                      Dimensions
                    </h4>
                    <div className="space-y-1">
                      {dimensions.map(col => (
                        <div 
                          key={col.key}
                          onClick={() => addToShelf('columns', col.key)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors group"
                        >
                          <Type size={12} className="opacity-50" />
                          <span className="truncate flex-1">{col.name}</span>
                          <Plus size={12} className="opacity-0 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Measures */}
                  <div>
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                      Measures
                    </h4>
                    <div className="space-y-1">
                      {measures.map(col => (
                        <div 
                          key={col.key}
                          onClick={() => addToShelf('rows', col.key)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors group"
                        >
                          <Hash size={12} className="opacity-50" />
                          <span className="truncate flex-1">{col.name}</span>
                          <Plus size={12} className="opacity-0 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualization Canvas */}
              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {/* Shelves Area */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
                  {/* Columns Shelf */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      <ColumnsIcon size={12} />
                      Columns
                    </div>
                    <div className="flex-1 min-h-[32px] bg-stone-50 rounded-lg border border-dashed border-stone-200 p-1 flex flex-wrap gap-2">
                      {vizShelves.columns.map(key => {
                        const col = sourceColumns.find(c => c.key === key);
                        return (
                          <div key={key} className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-medium border border-blue-200">
                            {col?.name}
                            <button onClick={() => removeFromShelf('columns', key)}><Trash2 size={10} /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rows Shelf */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      <RowsIcon size={12} />
                      Rows
                    </div>
                    <div className="flex-1 min-h-[32px] bg-stone-50 rounded-lg border border-dashed border-stone-200 p-1 flex flex-wrap gap-2">
                      {vizShelves.rows.map(key => {
                        const col = sourceColumns.find(c => c.key === key);
                        return (
                          <div key={key} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-medium border border-emerald-200">
                            {col?.name}
                            <button onClick={() => removeFromShelf('rows', key)}><Trash2 size={10} /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Marks Shelf */}
                  <div className="flex items-center gap-4 pt-2 border-t border-stone-100">
                    <div className="w-20 flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      <Palette size={12} />
                      Marks
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-[10px] text-stone-500">
                        <Palette size={10} /> Color
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-[10px] text-stone-500">
                        <Maximize2 size={10} /> Size
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-[10px] text-stone-500">
                        <Type size={10} /> Label
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <input 
                      type="text"
                      value={vizTitle}
                      onChange={(e) => setVizTitle(e.target.value)}
                      className="text-lg font-bold text-stone-900 bg-transparent border-none p-0 focus:ring-0 w-full"
                      placeholder="Sheet Title"
                    />
                    <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
                      <button 
                        onClick={() => setVizType('bar')}
                        className={cn("p-2 rounded-lg transition-all", vizType === 'bar' ? "bg-white shadow-sm text-blue-600" : "text-stone-400 hover:text-stone-600")}
                      >
                        <BarChartIcon size={16} />
                      </button>
                      <button 
                        onClick={() => setVizType('line')}
                        className={cn("p-2 rounded-lg transition-all", vizType === 'line' ? "bg-white shadow-sm text-blue-600" : "text-stone-400 hover:text-stone-600")}
                      >
                        <LineChartIcon size={16} />
                      </button>
                      <button 
                        onClick={() => setVizType('area')}
                        className={cn("p-2 rounded-lg transition-all", vizType === 'area' ? "bg-white shadow-sm text-blue-600" : "text-stone-400 hover:text-stone-600")}
                      >
                        <AreaChartIcon size={16} />
                      </button>
                      <button 
                        onClick={() => setVizType('pie')}
                        className={cn("p-2 rounded-lg transition-all", vizType === 'pie' ? "bg-white shadow-sm text-blue-600" : "text-stone-400 hover:text-stone-600")}
                      >
                        <PieChartIcon size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0">
                    {renderChart({
                      id: 'preview',
                      datasetId: selectedSourceId!,
                      type: vizType,
                      title: vizTitle,
                      shelves: vizShelves
                    }, true)}
                  </div>

                  <div className="absolute bottom-6 right-6 flex gap-2">
                    <button 
                      onClick={clearShelves}
                      className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-medium hover:bg-stone-200 transition-all"
                    >
                      Clear Sheet
                    </button>
                    <button 
                      onClick={handleAddVisualization}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                    >
                      <Plus size={14} />
                      Save to Dashboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Show Me Panel (Right Sidebar) */}
              <div className="w-48 bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex flex-col gap-4">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <Info size={12} />
                  Show Me
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'bar', icon: <BarChartIcon size={20} />, label: 'Bar' },
                    { type: 'line', icon: <LineChartIcon size={20} />, label: 'Line' },
                    { type: 'area', icon: <AreaChartIcon size={20} />, label: 'Area' },
                    { type: 'pie', icon: <PieChartIcon size={20} />, label: 'Pie' },
                    { type: 'scatter', icon: <ScatterChartIcon size={20} />, label: 'Scatter' }
                  ].map(item => (
                    <button
                      key={item.type}
                      onClick={() => setVizType(item.type as ChartType)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1",
                        vizType === item.type 
                          ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                          : "bg-stone-50 border-stone-100 text-stone-400 hover:border-stone-200"
                      )}
                    >
                      {item.icon}
                      <span className="text-[8px] font-bold uppercase">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-auto p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-[9px] text-blue-700 leading-relaxed">
                    <b>Tip:</b> Tableau works best when you drag dimensions to Columns and measures to Rows.
                  </p>
                </div>
              </div>
            </div>
          ) : activeTab === 'joins' ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                  <GitMerge size={20} />
                  Table Join Builder
                </h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Join Name</label>
                    <input 
                      type="text" 
                      value={newJoin.name}
                      onChange={(e) => setNewJoin({...newJoin, name: e.target.value})}
                      placeholder="e.g., Sales with Managers"
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Left Table</label>
                      <select 
                        value={newJoin.leftDatasetId}
                        onChange={(e) => setNewJoin({...newJoin, leftDatasetId: e.target.value, leftColumn: ''})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-stone-900"
                      >
                        <option value="">Select Table</option>
                        {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Right Table</label>
                      <select 
                        value={newJoin.rightDatasetId}
                        onChange={(e) => setNewJoin({...newJoin, rightDatasetId: e.target.value, rightColumn: ''})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-stone-900"
                      >
                        <option value="">Select Table</option>
                        {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Left Column (Key)</label>
                      <select 
                        value={newJoin.leftColumn}
                        onChange={(e) => setNewJoin({...newJoin, leftColumn: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-stone-900"
                      >
                        <option value="">Select Column</option>
                        {datasets.find(d => d.id === newJoin.leftDatasetId)?.columns.map(col => (
                          <option key={col.key} value={col.key}>{col.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Right Column (Key)</label>
                      <select 
                        value={newJoin.rightColumn}
                        onChange={(e) => setNewJoin({...newJoin, rightColumn: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-1 focus:ring-stone-900"
                      >
                        <option value="">Select Column</option>
                        {datasets.find(d => d.id === newJoin.rightDatasetId)?.columns.map(col => (
                          <option key={col.key} value={col.key}>{col.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Join Type</label>
                    <div className="flex gap-4">
                      {['inner', 'left'].map(type => (
                        <button
                          key={type}
                          onClick={() => setNewJoin({...newJoin, type: type as any})}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                            newJoin.type === type 
                              ? "bg-stone-900 text-white border-stone-900" 
                              : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                          )}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)} Join
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleAddJoin}
                    disabled={!newJoin.leftDatasetId || !newJoin.rightDatasetId || !newJoin.leftColumn || !newJoin.rightColumn}
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                  >
                    <GitMerge size={18} />
                    Create Joined Source
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <LayoutDashboard size={20} />
                  Dashboard
                </h2>
                <button 
                  onClick={() => setActiveTab('visualize')}
                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus size={14} />
                  New Visualization
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visualizations.filter(v => v.datasetId === selectedSourceId).map(viz => (
                  <div key={viz.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm group">
                    <div className="flex items-center justify-between mb-6">
                      <h5 className="text-sm font-bold text-stone-800">{viz.title}</h5>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setVisualizations(prev => prev.filter(v => v.id !== viz.id))}
                          className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      {renderChart(viz)}
                    </div>
                  </div>
                ))}
                
                {visualizations.filter(v => v.datasetId === selectedSourceId).length === 0 && (
                  <div className="lg:col-span-2 flex flex-col items-center justify-center py-20 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
                    <BarChart3 size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">No visualizations saved to dashboard yet.</p>
                    <button 
                      onClick={() => setActiveTab('visualize')}
                      className="mt-4 text-blue-600 font-medium hover:underline text-sm"
                    >
                      Go to Visualization Builder
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

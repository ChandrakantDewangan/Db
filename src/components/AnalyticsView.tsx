import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, Table as TableIcon, BarChart3, Settings2, Filter, 
  ChevronDown, ChevronUp, Trash2, Edit3, Download, Plus, GitMerge,
  GripVertical, Type as TypeIcon, Hash, Calendar, CheckCircle2, Search
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'data' | 'visualize' | 'joins'>('data');
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [joins, setJoins] = useState<Join[]>([]);
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
    if (selectedDataset) return selectedDataset.data;
    if (selectedJoin) {
      const leftDs = datasets.find(d => d.id === selectedJoin.leftDatasetId);
      const rightDs = datasets.find(d => d.id === selectedJoin.rightDatasetId);
      if (!leftDs || !rightDs) return [];

      return leftDs.data.map(leftRow => {
        const match = rightDs.data.find(rightRow => 
          String(leftRow[selectedJoin.leftColumn]) === String(rightRow[selectedJoin.rightColumn])
        );
        if (selectedJoin.type === 'inner' && !match) return null;
        return { ...leftRow, ...match };
      }).filter(Boolean);
    }
    return [];
  }, [selectedDataset, selectedJoin, datasets]);

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
    return sourceColumns.filter(c => c.visible).map(col => ({
      field: col.key,
      headerName: col.name,
      sortable: true,
      filter: true,
      editable: !!selectedDataset, // Only allow editing base datasets, not joins for now
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

  // Visualization Builder State
  const [newViz, setNewViz] = useState<Partial<Visualization>>({
    type: 'bar',
    xAxis: '',
    yAxis: '',
    title: 'New Visualization'
  });

  const isVizValid = selectedSourceId && newViz.xAxis && newViz.yAxis;

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
    if (selectedDataset) {
      const updatedColumns = selectedDataset.columns.map(col => 
        col.key === colKey ? { ...col, type: newType } : col
      );
      onUpdateDataset({ ...selectedDataset, columns: updatedColumns });
    } else if (selectedJoin) {
      const leftDs = datasets.find(d => d.id === selectedJoin.leftDatasetId);
      const rightDs = datasets.find(d => d.id === selectedJoin.rightDatasetId);
      
      if (leftDs && leftDs.columns.find(c => c.key === colKey)) {
        const updatedColumns = leftDs.columns.map(col => 
          col.key === colKey ? { ...col, type: newType } : col
        );
        onUpdateDataset({ ...leftDs, columns: updatedColumns });
      } else if (rightDs) {
        const baseKey = colKey.replace('joined_', '');
        if (rightDs.columns.find(c => c.key === baseKey)) {
          const updatedColumns = rightDs.columns.map(col => 
            col.key === baseKey ? { ...col, type: newType } : col
          );
          onUpdateDataset({ ...rightDs, columns: updatedColumns });
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
    if (!selectedSourceId || !newViz.xAxis || !newViz.yAxis) return;
    
    const viz: Visualization = {
      id: Date.now().toString(),
      datasetId: selectedSourceId,
      type: newViz.type as ChartType,
      xAxis: newViz.xAxis,
      yAxis: newViz.yAxis,
      title: newViz.title || 'Untitled Visualization'
    };

    setVisualizations(prev => [...prev, viz]);
  };

  const renderChart = (viz: Visualization) => {
    const data = sourceData;
    const commonProps = {
      data: data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (viz.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey={viz.xAxis} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Bar dataKey={viz.yAxis} fill="#141414" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey={viz.xAxis} axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={viz.yAxis} stroke="#141414" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey={viz.xAxis} />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey={viz.yAxis} stroke="#141414" fill="#141414" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey={viz.yAxis}
                nameKey={viz.xAxis}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey={viz.xAxis} name={viz.xAxis} />
              <YAxis type="number" dataKey={viz.yAxis} name={viz.yAxis} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Data" data={data} fill="#141414" />
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
              onClick={() => setActiveTab('joins')}
              className={cn(
                "py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2",
                activeTab === 'joins' ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
              )}
            >
              <GitMerge size={16} />
              Join Tables
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
        <div className={cn("flex-1 p-6 bg-stone-50/50", activeTab !== 'data' && "overflow-y-auto")}>
          {activeTab === 'data' ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="ag-theme-alpine w-full flex-1">
                <AgGridReact
                  ref={gridRef}
                  rowData={sourceData}
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
            <div className="space-y-8">
              {/* Viz Builder */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <h4 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <Settings2 size={16} />
                  Create New Visualization
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Chart Type</label>
                    <select 
                      value={newViz.type}
                      onChange={(e) => setNewViz({...newViz, type: e.target.value as ChartType})}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="area">Area Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="scatter">Scatter Plot</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">X-Axis (Dimension)</label>
                    <select 
                      value={newViz.xAxis}
                      onChange={(e) => setNewViz({...newViz, xAxis: e.target.value})}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="">Select Column</option>
                      {sourceColumns.map(col => (
                        <option key={col.key} value={col.key}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Y-Axis (Measure)</label>
                    <select 
                      value={newViz.yAxis}
                      onChange={(e) => setNewViz({...newViz, yAxis: e.target.value})}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="">Select Column</option>
                      {sourceColumns.filter(c => c.type === 'number').map(col => (
                        <option key={col.key} value={col.key}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleAddVisualization}
                      disabled={!isVizValid}
                      title={!isVizValid ? "Please select both X and Y axis columns" : "Create visualization"}
                      className="w-full py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Launch Chart
                    </button>
                  </div>
                </div>
              </div>

              {/* Viz Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visualizations.filter(v => v.datasetId === selectedSourceId).map(viz => (
                  <div key={viz.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm group">
                    <div className="flex items-center justify-between mb-6">
                      <h5 className="text-sm font-bold text-stone-800">{viz.title}</h5>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-stone-400 hover:text-stone-900 transition-colors">
                          <Edit3 size={14} />
                        </button>
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
                    <p className="text-sm">Create your first visualization using the builder above</p>
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

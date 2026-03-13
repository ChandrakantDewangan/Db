import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, Table as TableIcon, BarChart3, Settings2, Filter, 
  ChevronDown, ChevronUp, Trash2, Edit3, Download, Plus
} from 'lucide-react';
import { Dataset, Column, Visualization, ChartType } from '../types';
import { cn } from '../lib/utils';

const COLORS = ['#141414', '#F27D26', '#00FF00', '#FF4444', '#4444FF', '#FF00FF'];

interface AnalyticsViewProps {
  datasets: Dataset[];
  onUpdateDataset: (dataset: Dataset) => void;
  onRemoveDataset: (id: string) => void;
}

export default function AnalyticsView({ datasets, onUpdateDataset, onRemoveDataset }: AnalyticsViewProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(datasets.length > 0 ? datasets[0].id : null);
  const [activeTab, setActiveTab] = useState<'data' | 'visualize'>('data');
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  
  // Visualization Builder State
  const [newViz, setNewViz] = useState<Partial<Visualization>>({
    type: 'bar',
    xAxis: '',
    yAxis: '',
    title: 'New Visualization'
  });

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  // Sorting/Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [filterText, setFilterText] = useState('');

  const processedData = useMemo(() => {
    if (!selectedDataset) return [];
    let data = [...selectedDataset.data];

    // Filter
    if (filterText) {
      data = data.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(filterText.toLowerCase())
        )
      );
    }

    // Sort
    if (sortConfig) {
      data.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [selectedDataset, sortConfig, filterText]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleColumnVisibility = (colKey: string) => {
    if (!selectedDataset) return;
    const updatedColumns = selectedDataset.columns.map(col => 
      col.key === colKey ? { ...col, visible: !col.visible } : col
    );
    onUpdateDataset({ ...selectedDataset, columns: updatedColumns });
  };

  const handleAddVisualization = () => {
    if (!selectedDatasetId || !newViz.xAxis || !newViz.yAxis) return;
    
    const viz: Visualization = {
      id: Date.now().toString(),
      datasetId: selectedDatasetId,
      type: newViz.type as ChartType,
      xAxis: newViz.xAxis,
      yAxis: newViz.yAxis,
      title: newViz.title || 'Untitled Visualization'
    };

    setVisualizations(prev => [...prev, viz]);
  };

  const renderChart = (viz: Visualization) => {
    const data = selectedDataset?.data || [];
    
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
          Go back to the chat and add a dataset to the analytics space to start your analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-stone-200 flex flex-col bg-stone-50">
        <div className="p-4 border-b border-stone-200">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Datasets</h3>
          <div className="space-y-1">
            {datasets.map(ds => (
              <button
                key={ds.id}
                onClick={() => setSelectedDatasetId(ds.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group transition-all",
                  selectedDatasetId === ds.id 
                    ? "bg-stone-900 text-white shadow-md" 
                    : "text-stone-600 hover:bg-stone-200"
                )}
              >
                <span className="truncate flex-1">{ds.name}</span>
                <Trash2 
                  size={14} 
                  className={cn(
                    "opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity",
                    selectedDatasetId === ds.id && "text-white/50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDataset(ds.id);
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
              {selectedDataset.columns.map(col => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={col.visible} 
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                  />
                  <span className={cn(
                    "text-xs font-medium transition-colors",
                    col.visible ? "text-stone-700" : "text-stone-400"
                  )}>
                    {col.name}
                  </span>
                </label>
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
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
          {activeTab === 'data' ? (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      {selectedDataset?.columns.filter(c => c.visible).map(col => (
                        <th 
                          key={col.key} 
                          onClick={() => handleSort(col.key)}
                          className="px-6 py-4 font-semibold text-stone-600 cursor-pointer hover:bg-stone-100 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            {col.name}
                            <span className="text-stone-300 group-hover:text-stone-500">
                              {sortConfig?.key === col.key ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                              ) : <ChevronDown size={14} className="opacity-0 group-hover:opacity-100" />}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.map((row, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50/50 transition-colors">
                        {selectedDataset?.columns.filter(c => c.visible).map(col => (
                          <td key={col.key} className="px-6 py-4 text-stone-600 font-mono text-xs">
                            {String(row[col.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      {selectedDataset?.columns.map(col => (
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
                      {selectedDataset?.columns.filter(c => c.type === 'number').map(col => (
                        <option key={col.key} value={col.key}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleAddVisualization}
                      disabled={!newViz.xAxis || !newViz.yAxis}
                      className="w-full py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add Chart
                    </button>
                  </div>
                </div>
              </div>

              {/* Viz Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visualizations.filter(v => v.datasetId === selectedDatasetId).map(viz => (
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
                
                {visualizations.filter(v => v.datasetId === selectedDatasetId).length === 0 && (
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

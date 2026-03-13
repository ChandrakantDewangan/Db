/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LayoutDashboard, Database, Sparkles, Download, Share2 } from 'lucide-react';
import AnalyticsView from './components/AnalyticsView';
import { Dataset } from './types';
import { DUMMY_DATASETS } from './data/dummyData';

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>(DUMMY_DATASETS);

  const handleUpdateDataset = (updatedDataset: Dataset) => {
    setDatasets(prev => prev.map(d => d.id === updatedDataset.id ? updatedDataset : d));
  };

  const handleRemoveDataset = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-6 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-stone-200">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">InsightStream Analytics</h1>
            <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest">Advanced Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <div className="px-4 py-1.5 bg-white text-stone-900 shadow-sm rounded-lg text-sm font-medium flex items-center gap-2">
              <Database size={16} />
              Data Workspace
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors" title="Export All">
            <Download size={18} />
          </button>
          <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors" title="Share Workspace">
            <Share2 size={18} />
          </button>
          <div className="h-8 w-[1px] bg-stone-200 mx-2" />
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-stone-200 overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/user${i}/32/32`} 
                  alt="User" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnalyticsView 
          datasets={datasets} 
          onUpdateDataset={handleUpdateDataset}
          onRemoveDataset={handleRemoveDataset}
        />
      </main>
    </div>
  );
}



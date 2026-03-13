/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MessageSquare, LayoutDashboard, Database, Sparkles } from 'lucide-react';
import ChatView from './components/ChatView';
import AnalyticsView from './components/AnalyticsView';
import { Message, Dataset } from './types';
import { cn } from './lib/utils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'analytics'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const handleAddDataset = (dataset: Dataset) => {
    setDatasets(prev => {
      // Check if dataset already exists by name (simple check)
      if (prev.some(d => d.name === dataset.name)) {
        return prev;
      }
      return [...prev, dataset];
    });
    // Optional: Show a notification or switch tab
    // setActiveTab('analytics');
  };

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
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">InsightStream</h1>
            <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest">Analytics AI</p>
          </div>
        </div>

        <nav className="flex bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === 'chat' 
                ? "bg-white text-stone-900 shadow-sm" 
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            <MessageSquare size={16} />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all relative",
              activeTab === 'analytics' 
                ? "bg-white text-stone-900 shadow-sm" 
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            <LayoutDashboard size={16} />
            Analytics
            {datasets.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-stone-900 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                {datasets.length}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-4">
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
          <button className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
            <Database size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className={cn(
          "absolute inset-0 transition-all duration-500 ease-in-out transform",
          activeTab === 'chat' ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
        )}>
          <ChatView 
            messages={messages} 
            setMessages={setMessages} 
            onAddDataset={handleAddDataset} 
          />
        </div>
        
        <div className={cn(
          "absolute inset-0 transition-all duration-500 ease-in-out transform",
          activeTab === 'analytics' ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        )}>
          <AnalyticsView 
            datasets={datasets} 
            onUpdateDataset={handleUpdateDataset}
            onRemoveDataset={handleRemoveDataset}
          />
        </div>
      </main>
    </div>
  );
}


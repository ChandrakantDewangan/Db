import React, { useState, useRef, useEffect } from 'react';
import { Send, Table as TableIcon, Plus, Loader2 } from 'lucide-react';
import { chatWithGemini } from '../services/gemini';
import { Message, Dataset, Column, DataType } from '../types';
import { cn } from '../lib/utils';

interface ChatViewProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onAddDataset: (dataset: Dataset) => void;
}

export default function ChatView({ messages, setMessages, onAddDataset }: ChatViewProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      chatHistory.push({ role: 'user', parts: [{ text: input }] });

      const response = await chatWithGemini(chatHistory);

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: response.text,
        tableData: response.tableData,
        tableName: response.tableData ? `Dataset ${new Date().toLocaleTimeString()}` : undefined,
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const inferType = (value: any): DataType => {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      if (!isNaN(Date.parse(value))) return 'date';
      return 'string';
    }
    return 'string';
  };

  const handleAddToAnalytics = (msg: Message) => {
    if (!msg.tableData) return;

    const firstRow = msg.tableData[0];
    const columns: Column[] = Object.keys(firstRow).map(key => ({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      type: inferType(firstRow[key]),
      visible: true,
    }));

    const newDataset: Dataset = {
      id: Date.now().toString(),
      name: msg.tableName || 'Untitled Dataset',
      sourceAgent: 'Gemini Assistant',
      timestamp: Date.now(),
      data: msg.tableData,
      columns,
    };

    onAddDataset(newDataset);
  };

  return (
    <div className="flex flex-col h-full bg-stone-50">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-4">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <TableIcon size={32} />
            </div>
            <p className="text-sm font-medium">Ask me to generate some data to get started</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setInput("Show me a table of top 5 tech companies by revenue in 2023")}
                className="px-3 py-1 text-xs bg-white border border-stone-200 rounded-full hover:bg-stone-100 transition-colors"
              >
                Tech Revenue
              </button>
              <button 
                onClick={() => setInput("Generate a dataset of monthly sales for a fictional coffee shop")}
                className="px-3 py-1 text-xs bg-white border border-stone-200 rounded-full hover:bg-stone-100 transition-colors"
              >
                Coffee Sales
              </button>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={cn(
            "flex flex-col max-w-[85%]",
            msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "px-4 py-3 rounded-2xl text-sm shadow-sm",
              msg.role === 'user' 
                ? "bg-stone-900 text-white rounded-tr-none" 
                : "bg-white text-stone-800 border border-stone-200 rounded-tl-none"
            )}>
              {msg.content}
            </div>

            {msg.tableData && (
              <div className="mt-4 w-full bg-white border border-stone-200 rounded-xl overflow-hidden shadow-md">
                <div className="px-4 py-2 bg-stone-50 border-bottom border-stone-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                    <TableIcon size={14} />
                    {msg.tableName}
                  </span>
                  <button 
                    onClick={() => handleAddToAnalytics(msg)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    <Plus size={14} />
                    Add to Analytics
                  </button>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        {Object.keys(msg.tableData[0]).map(key => (
                          <th key={key} className="px-4 py-2 font-semibold text-stone-600 border-r border-stone-100 last:border-r-0">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {msg.tableData.map((row, i) => (
                        <tr key={i} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-2 text-stone-600 border-r border-stone-100 last:border-r-0">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-stone-400 text-xs italic">
            <Loader2 size={14} className="animate-spin" />
            Gemini is thinking...
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-stone-200">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-stone-900 transition-all outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

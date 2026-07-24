/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Code2, Loader2, Send, Copy, Check, Clock } from 'lucide-react';

interface HistoryItem {
  id: string;
  requirement: string;
  result: string;
  timestamp: number;
}

export default function App() {
  const [requirement, setRequirement] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('ai-code-history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ai-code-history', JSON.stringify(history));
  }, [history]);

  const handleGenerate = async () => {
    if (!requirement.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      setResult(''); // Clear previous result immediately when starting a new generation
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }
      
      if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let currentResult = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                currentResult += data.text;
                setResult(currentResult);
              }
            } catch (e) {
              console.error('Error parsing stream data', e);
            }
          }
        }
      }
      
      setHistory(prev => [
        {
          id: Date.now().toString(),
          requirement,
          result: currentResult,
          timestamp: Date.now(),
        },
        ...prev
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const loadHistoryItem = (item: HistoryItem) => {
    setRequirement(item.requirement);
    setResult(item.result);
    setError('');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative overflow-x-hidden">
      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
        <h1 className="text-[12vw] font-black text-neutral-800/40 whitespace-nowrap select-none -rotate-6">
          AI CODE HELPER
        </h1>
      </div>

      <header className="bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center space-x-3 sticky top-0 z-20">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">AI Code Helper</h1>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <div className="lg:col-span-2 flex flex-col space-y-6 relative z-10">
          <div className="relative rounded-2xl p-[3px] overflow-hidden group focus-within:shadow-md transition-shadow">
            <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_180deg,#60a5fa_270deg,#c084fc_360deg)] opacity-80 group-focus-within:opacity-100 transition-opacity"></div>
            <section className="relative bg-neutral-900 rounded-xl z-10 flex flex-col h-full w-full">
              <div className="p-4 flex flex-col space-y-4">
                <label htmlFor="requirement" className="text-sm font-medium text-neutral-300">
                  Describe your requirements in plain English
                </label>
                <textarea
                  id="requirement"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="e.g. I need a Python script that reads a CSV file and prints the names of people older than 30."
                  className="w-full h-32 p-3 text-base border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-neutral-900 text-neutral-100 placeholder-neutral-500 relative z-20"
                  disabled={loading}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !requirement.trim()}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-20"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span>Generate Code</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          {error && (
            <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-xl">
              {error}
            </div>
          )}

          {result && (
            <section className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 overflow-hidden flex flex-col">
              <div className="bg-neutral-900 px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
                <h2 className="text-sm font-medium text-neutral-300">Generated Code</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 transition-colors text-xs font-medium"
                  title="Copy output to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-5 prose prose-invert max-w-none prose-pre:bg-black prose-pre:rounded-lg overflow-x-auto">
                <div className="markdown-body">
                  <Markdown>{result}</Markdown>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-1 hidden lg:block">
          <section className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-4 h-[calc(100vh-8rem)] sticky top-24 flex flex-col">
            <div className="flex items-center space-x-2 mb-4 shrink-0">
              <Clock className="w-5 h-5 text-neutral-400" />
              <h2 className="font-medium text-neutral-300">Search History</h2>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-1 -mr-1">
              {history.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-8">No history yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistoryItem(item)}
                      className="w-full text-left p-3 rounded-lg border border-neutral-800 bg-neutral-950/50 hover:bg-neutral-800 hover:border-neutral-700 transition-colors text-sm group"
                    >
                      <p className="font-medium text-neutral-300 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {item.requirement}
                      </p>
                      <p className="text-xs text-neutral-500 mt-2">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

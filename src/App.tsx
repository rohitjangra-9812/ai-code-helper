/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code2, Loader2, Send, Copy, Check, Clock, Home, User, Bell, HelpCircle, Activity, Edit3, Mic, ImageIcon } from 'lucide-react';
import AdminPanel from './AdminPanel';

interface HistoryItem {
  id: string;
  requirement: string;
  result: string;
  timestamp: number;
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('generator');
  const [requirement, setRequirement] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('ai-code-history');
    return saved ? JSON.parse(saved) : [];
  });

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('ai-code-profile');
    return saved ? JSON.parse(saved) : { name: 'User 123', email: 'user@example.com', isCompleted: false };
  });

  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Welcome to AI Code Helper! This is your private workspace.', read: false },
    { id: 2, text: 'Complete your profile to unlock unlimited generations.', read: false }
  ]);
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [adminClicks, setAdminClicks] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const toggleListen = () => {
    if (isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setRequirement(prev => prev ? prev + (prev.endsWith(' ') ? '' : ' ') + finalTranscript : finalTranscript);
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
      if (event.error === 'not-allowed') {
        alert('Microphone access was denied. Please allow microphone permissions to use voice dictation.');
      }
      setIsListening(false);
    };

    recognition.start();
  };

  useEffect(() => {
    localStorage.setItem('ai-code-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('ai-code-profile', JSON.stringify(profile));
  }, [profile]);

  const generationsToday = history.filter(item => {
    const itemDate = new Date(item.timestamp);
    const today = new Date();
    return itemDate.getDate() === today.getDate() && itemDate.getMonth() === today.getMonth() && itemDate.getFullYear() === today.getFullYear();
  }).length;

  const handleGenerate = async () => {
    if (!requirement.trim()) return;

    if (generationsToday >= 6 && !profile.isCompleted) {
      setError('You have reached the limit of 6 generations for today. It is mandatory to complete your profile to continue using the portal.');
      setActiveTab('profile');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      setResult('');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement }),
      });
      
      // Check if the response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const rawText = await response.text();
        throw new Error(`Server returned non-JSON: ${rawText.slice(0, 100)}`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data.result);
      setHistory(prev => [{ id: Date.now().toString(), requirement, result: data.result, timestamp: Date.now() }, ...prev]);
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
    setActiveTab('generator');
  };
  
  const submitTicket = () => {
    if (!ticketMsg) return;
    setTicketStatus('Ticket submitted successfully. Support will respond soon.');
    setTicketMsg('');
    setTimeout(() => setTicketStatus(''), 4000);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
        <h1 className="text-[12vw] font-black text-neutral-800/40 whitespace-nowrap select-none -rotate-6">AI CODE HELPER</h1>
      </div>

      <header className="bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-6 py-4 flex items-center space-x-6 sticky top-0 z-20 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-blue-600 p-2 rounded-lg"><Code2 className="w-5 h-5 text-white" /></div>
          <h1 className="text-lg font-semibold tracking-tight hidden sm:block">AI Code Helper</h1>
        </div>
        
        <nav className="flex items-center space-x-2 border-l border-neutral-800 pl-6">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'generator', icon: Edit3, label: 'Generator' },
            { id: 'profile', icon: User, label: 'Profile' },
            { id: 'history', icon: Clock, label: 'History' },
            { id: 'notifications', icon: Bell, label: 'Alerts' },
            { id: 'support', icon: HelpCircle, label: 'Support' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
              {tab.id === 'notifications' && notifications.some(n => !n.read) && (
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-6 relative z-10">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Welcome back, {profile.name}!</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <Activity className="w-8 h-8 text-blue-500 mb-3" />
                <h3 className="text-neutral-400 font-medium">Snippets Generated</h3>
                <p className="text-3xl font-bold text-white mt-2">{history.length}</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <Clock className="w-8 h-8 text-purple-500 mb-3" />
                <h3 className="text-neutral-400 font-medium">Last Activity</h3>
                <p className="text-xl font-bold text-white mt-2">
                  {history.length > 0 ? new Date(history[0].timestamp).toLocaleDateString() : 'None'}
                </p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col justify-center">
                <h3 className="text-neutral-400 font-medium mb-4">Quick Shortcuts</h3>
                <div className="space-y-2">
                  <button onClick={() => setActiveTab('generator')} className="w-full text-left px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors">Start New Generation</button>
                  <button onClick={() => setActiveTab('profile')} className="w-full text-left px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors">Update Profile</button>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">Recent Activity Feed</h3>
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.slice(0, 3).map(item => (
                    <div key={item.id} className="border-l-2 border-blue-500 pl-4 py-1">
                      <p className="text-sm text-neutral-300">Generated code for: <span className="font-mono text-xs bg-neutral-800 px-1 rounded">{item.requirement.substring(0, 40)}...</span></p>
                      <p className="text-xs text-neutral-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-neutral-500 text-sm">No recent activity.</p>}
            </div>
          </div>
        )}

        {activeTab === 'generator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="relative rounded-2xl p-[3px] overflow-hidden group focus-within:shadow-md transition-shadow">
                <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_180deg,#60a5fa_270deg,#c084fc_360deg)] opacity-80 group-focus-within:opacity-100 transition-opacity"></div>
                <section className="relative bg-neutral-900 rounded-xl z-10 flex flex-col h-full w-full">
                  <div className="p-4 flex flex-col space-y-4">
                    <label htmlFor="requirement" className="text-sm font-medium text-neutral-300">Describe your requirements in plain English</label>
                    <textarea
                      id="requirement"
                      value={requirement}
                      onChange={(e) => setRequirement(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      placeholder="e.g. I need a Python script that reads a CSV file..."
                      className="w-full h-32 p-3 text-base border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-neutral-900 text-neutral-100 placeholder-neutral-500 relative z-20 resize-none"
                      disabled={loading}
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={toggleListen}
                        className={`flex items-center justify-center p-2.5 rounded-lg transition-colors ${
                          isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                        }`}
                        title="Dictate requirements"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={loading || !requirement.trim()}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 relative z-20"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        <span>Generate</span>
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              {error && <div className="p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-xl">{error}</div>}

              {result && (
                <section className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 overflow-hidden">
                  <div className="bg-neutral-900 px-5 py-3 border-b border-neutral-800 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-neutral-300">Generated Code</h2>
                    <button onClick={handleCopy} className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 transition-colors text-xs font-medium">
                      {copied ? <><Check className="w-4 h-4 text-green-400" /><span className="text-green-400">Copied</span></> : <><Copy className="w-4 h-4" /><span>Copy</span></>}
                    </button>
                  </div>
                  <div className="p-5 prose prose-invert max-w-none prose-pre:bg-black prose-pre:rounded-lg overflow-x-auto">
                    <div className="markdown-body">
                      <Markdown
                        components={{
                          code(props) {
                            const {children, className, node, ...rest} = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <SyntaxHighlighter
                                {...(rest as any)}
                                PreTag="div"
                                children={String(children).replace(/\n$/, '')}
                                language={match[1]}
                                style={vscDarkPlus}
                              />
                            ) : (
                              <code {...rest} className={className}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {result}
                      </Markdown>
                    </div>
                  </div>
                </section>
              )}
            </div>
            
            <div className="lg:col-span-1 hidden lg:block">
              <section className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 sticky top-24 flex flex-col max-h-[600px]">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <h2 className="font-medium text-neutral-300 text-sm">Recent History</h2>
                  </div>
                  <button onClick={() => setActiveTab('history')} className="text-xs text-blue-400 hover:underline">View All</button>
                </div>
                <div className="overflow-y-auto flex-1 pr-1 space-y-2">
                  {history.slice(0, 5).map((item) => (
                    <button key={item.id} onClick={() => loadHistoryItem(item)} className="w-full text-left p-2.5 rounded-lg border border-neutral-800 bg-neutral-950/50 hover:bg-neutral-800 transition-colors text-sm">
                      <p className="font-medium text-neutral-300 line-clamp-1 text-xs">{item.requirement}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </button>
                  ))}
                  {history.length === 0 && <p className="text-xs text-neutral-500 text-center py-4">No history yet.</p>}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-2xl">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-neutral-800 pb-4">Profile Settings</h2>
            
            {error && !profile.isCompleted && (
              <div className="p-4 mb-6 bg-yellow-950/50 text-yellow-400 border border-yellow-900/50 rounded-xl">
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Display Name</label>
                <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Email Address</label>
                <input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="w-full bg-black border border-neutral-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
                <button className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-lg text-sm transition-colors">Change Password</button>
              </div>
              <div className="pt-4 border-t border-neutral-800">
                <button 
                  onClick={() => {
                    setProfile({ ...profile, isCompleted: true });
                    setError('');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
                {profile.isCompleted && <span className="ml-4 text-sm text-green-400">Profile saved and completed!</span>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <button 
                onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                className="text-xs text-blue-400 hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="space-y-3">
              {notifications.map(notif => (
                <div key={notif.id} className={`p-4 rounded-lg border flex items-start justify-between ${notif.read ? 'bg-neutral-950/50 border-neutral-800' : 'bg-blue-900/10 border-blue-900/30'}`}>
                  <div className="flex items-center space-x-3">
                    {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>}
                    <p className={`text-sm ${notif.read ? 'text-neutral-400' : 'text-neutral-200'}`}>{notif.text}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-neutral-500 text-sm">No new notifications.</p>}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden max-w-4xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Activity Logs & History</h2>
              <button onClick={() => {if(confirm('Clear history?')) setHistory([])}} className="text-xs text-red-400 hover:underline">Clear All</button>
            </div>
            <div className="divide-y divide-neutral-800 max-h-[600px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-center text-neutral-500 py-8">No generation history.</p>
              ) : (
                history.map(item => (
                  <div key={item.id} className="p-4 hover:bg-neutral-800/30 transition-colors flex justify-between items-start">
                    <div className="pr-4">
                      <p className="text-sm font-medium text-neutral-300 mb-1 line-clamp-2">{item.requirement}</p>
                      <p className="text-xs text-neutral-500">{new Date(item.timestamp).toLocaleString()}</p>
                    </div>
                    <button onClick={() => loadHistoryItem(item)} className="shrink-0 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded text-xs transition-colors">
                      Load
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Help & Support</h2>
            <p className="text-neutral-400 text-sm mb-6 border-b border-neutral-800 pb-4">Report bugs, request features, or ask for assistance.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Describe your issue</label>
                <textarea 
                  value={ticketMsg} 
                  onChange={e => setTicketMsg(e.target.value)}
                  className="w-full h-32 bg-black border border-neutral-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none resize-none"
                  placeholder="What's going wrong?"
                ></textarea>
              </div>
              <button onClick={submitTicket} disabled={!ticketMsg.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors">
                Submit Ticket
              </button>
              {ticketStatus && <p className="text-sm text-green-400 mt-2 bg-green-900/20 p-2 rounded border border-green-900/30">{ticketStatus}</p>}
            </div>
          </div>
        )}

      </main>

      {/* Secret Admin Trigger */}
      <div 
        className="fixed bottom-4 right-4 text-[10px] text-neutral-800 hover:text-neutral-500 cursor-pointer z-50 font-mono select-none"
        onClick={() => {
          const newClicks = adminClicks + 1;
          setAdminClicks(newClicks);
          if (newClicks >= 6) {
            window.history.pushState({}, '', '/secret-admin-portal');
            window.dispatchEvent(new PopStateEvent('popstate'));
            setAdminClicks(0);
          }
        }}
        title="Click 6 times for Admin Panel"
      >
        v1.1.0
      </div>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (path === '/secret-admin-portal') {
    return <AdminPanel />;
  }

  return <MainApp />;
}


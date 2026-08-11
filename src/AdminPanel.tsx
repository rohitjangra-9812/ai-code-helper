import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Activity, Lock, Unlock, LogOut, Users, MessageSquare, BarChart, Settings as SettingsIcon } from 'lucide-react';

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('admin-token') || '');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLockdown, setIsLockdown] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [users, setUsers] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setIsLockdown(data.isLockdown);
      } else {
        setToken('');
        localStorage.removeItem('admin-token');
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchData = async () => {
    if (!token) return;
    try {
      const [usersRes, contentRes, analyticsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/content', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (usersRes.ok) setUsers((await usersRes.json()).users);
      if (contentRes.ok) setContent((await contentRes.json()).content);
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (settingsRes.ok) setSettings((await settingsRes.json()).settings);
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatus();
      fetchData();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('admin-token', data.token);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  const toggleLockdown = async () => {
    try {
      await fetch('/api/admin/lockdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isLockdown: !isLockdown })
      });
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/users/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch(err) { console.error(err); }
  };

  const updateContentStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/content/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch(err) { console.error(err); }
  };
  
  const updateSetting = async (key: string, value: any) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ [key]: value })
      });
      fetchData();
    } catch(err) { console.error(err); }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 text-neutral-100 font-sans">
        <div className="bg-neutral-900 p-8 rounded-xl border border-neutral-800 w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
          
          <div className="flex flex-col items-center justify-center space-y-3 mb-8 text-neutral-300">
            <ShieldAlert className="w-12 h-12 text-red-500 mb-2" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Restricted Access</h1>
            <p className="text-sm text-neutral-500 text-center">Administrative portal. Unauthorized access is strictly prohibited and logged.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Security Passphrase</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-black border border-neutral-800 rounded-lg focus:outline-none focus:border-red-500 text-neutral-100 font-mono"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-950/50 p-2 rounded border border-red-900/50">{error}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg font-medium transition-colors">
              Authorize
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex flex-col font-sans">
      <header className="flex items-center justify-between pb-6 border-b border-neutral-800 mb-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 pr-6 border-r border-neutral-800">
            <div className="p-2 bg-blue-900/30 rounded-lg border border-blue-900/50">
              <Shield className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Command Center</h1>
              <p className="text-xs text-neutral-500 font-mono">SYS_ADMIN_ACTIVE</p>
            </div>
          </div>
          
          <nav className="flex space-x-2">
            {[
              { id: 'dashboard', icon: Shield, label: 'Dashboard' },
              { id: 'users', icon: Users, label: 'Users' },
              { id: 'content', icon: MessageSquare, label: 'Moderation' },
              { id: 'analytics', icon: BarChart, label: 'Analytics' },
              { id: 'settings', icon: SettingsIcon, label: 'Settings' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        <button
          onClick={() => { setToken(''); localStorage.removeItem('admin-token'); }}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Security Controls</span>
                </h2>
                <div className="flex flex-col space-y-4">
                  <div className={`p-4 rounded-lg border ${isLockdown ? 'bg-red-950/30 border-red-900/50' : 'bg-green-950/10 border-green-900/30'} flex items-start justify-between transition-colors`}>
                    <div>
                      <p className={`font-medium ${isLockdown ? 'text-red-400' : 'text-green-400'}`}>
                        {isLockdown ? 'Lockdown Active' : 'System Secure'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {isLockdown ? 'All external generation requests are being blocked.' : 'Normal operations running smoothly.'}
                      </p>
                    </div>
                    {isLockdown ? <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" /> : <Shield className="w-5 h-5 text-green-500 shrink-0" />}
                  </div>

                  <button
                    onClick={toggleLockdown}
                    className={`w-full p-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${
                      isLockdown
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                        : 'bg-red-600/90 hover:bg-red-600 text-white'
                    }`}
                  >
                    {isLockdown ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    <span>{isLockdown ? 'Lift Lockdown' : 'Initiate Lockdown'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 h-[600px] flex flex-col">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4 flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>Live Activity Stream & Audit Logs</span>
                </h2>
                <div className="flex-1 bg-black rounded-lg border border-neutral-800 p-4 overflow-y-auto font-mono text-sm space-y-4">
                  {logs.length === 0 ? (
                    <p className="text-neutral-600 italic">No activity detected...</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="border-b border-neutral-900/50 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.action.includes('BLOCKED') || log.action.includes('FAILED') || log.action.includes('ALERT')
                              ? 'bg-red-950/50 text-red-400 border border-red-900/50'
                              : log.action.includes('LOGIN')
                              ? 'bg-blue-950/50 text-blue-400 border border-blue-900/50'
                              : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-neutral-600 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-neutral-300 leading-relaxed text-xs">{log.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950/50 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Last Active</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="p-4">
                      <p className="text-white font-medium">{u.name}</p>
                      <p className="text-neutral-500 text-xs">{u.email}</p>
                    </td>
                    <td className="p-4"><span className="px-2 py-1 bg-neutral-800 rounded text-neutral-300 text-xs">{u.role}</span></td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs flex items-center inline-flex space-x-1 ${
                        u.status === 'active' ? 'bg-green-950/30 text-green-400' : 'bg-red-950/30 text-red-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span>{u.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-neutral-400">{new Date(u.lastActive).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active')}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 transition-colors"
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950/50 border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Content</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {content.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="p-4"><span className="px-2 py-1 bg-neutral-800 rounded text-neutral-300 text-xs uppercase">{c.type}</span></td>
                    <td className="p-4 text-neutral-300 max-w-md truncate">{c.content}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        c.status === 'approved' ? 'bg-green-950/30 text-green-400' :
                        c.status === 'rejected' ? 'bg-red-950/30 text-red-400' :
                        'bg-yellow-950/30 text-yellow-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-neutral-400 text-xs">{new Date(c.timestamp).toLocaleString()}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => updateContentStatus(c.id, 'approved')} className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded transition-colors text-xs">Approve</button>
                      <button onClick={() => updateContentStatus(c.id, 'rejected')} className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors text-xs">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-neutral-500 text-sm mb-2">Total Users</h3>
              <p className="text-4xl font-bold text-white">{analytics.totalUsers}</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-neutral-500 text-sm mb-2">Active Users</h3>
              <p className="text-4xl font-bold text-green-400">{analytics.activeUsers}</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-neutral-500 text-sm mb-2">Total Generations</h3>
              <p className="text-4xl font-bold text-blue-400">{analytics.totalGenerations}</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-neutral-500 text-sm mb-2">Error Events</h3>
              <p className="text-4xl font-bold text-red-400">{analytics.errorCount}</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && settings && (
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 max-w-2xl">
            <h2 className="text-lg font-medium text-white mb-6 border-b border-neutral-800 pb-4">Global Configurations</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Maintenance Mode</h3>
                  <p className="text-neutral-500 text-sm">Disables access to the public site for users.</p>
                </div>
                <button 
                  onClick={() => updateSetting('maintenanceMode', !settings.maintenanceMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenanceMode ? 'bg-blue-600' : 'bg-neutral-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.maintenanceMode ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Allow New Registrations</h3>
                  <p className="text-neutral-500 text-sm">Toggle signups for new users.</p>
                </div>
                <button 
                  onClick={() => updateSetting('allowNewRegistrations', !settings.allowNewRegistrations)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowNewRegistrations ? 'bg-blue-600' : 'bg-neutral-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.allowNewRegistrations ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <label className="block text-white font-medium mb-1">API Limit Per User</label>
                <p className="text-neutral-500 text-sm mb-3">Maximum requests allowed per user before rate limiting.</p>
                <div className="flex items-center space-x-3">
                  <input 
                    type="number" 
                    value={settings.apiLimitPerUser}
                    onChange={(e) => updateSetting('apiLimitPerUser', parseInt(e.target.value))}
                    className="bg-black border border-neutral-700 text-white p-2 rounded-lg w-32 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-neutral-500 text-sm">requests / hr</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


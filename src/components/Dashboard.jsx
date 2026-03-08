import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Filter, 
  Calendar,
  LayoutGrid,
  BarChart3,
  LineChart as LineChartIcon,
  Search,
  Zap,
  Crown,
  Trophy,
  Target,
  Sparkles,
  AlertCircle,
  Lightbulb,
  ArrowUpRight,
  Settings,
  Lock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const API_URL = 'http://localhost:3001';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [productFilter, setProductFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');

  // AI States
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [aiInsights, setAiInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Load config strictly from environment variables
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const envModel = import.meta.env.VITE_GEMINI_MODEL;
    
    if (envKey && envKey !== 'your_api_key_here') {
      setApiKey(envKey);
    }
    if (envModel) {
      setSelectedModel(envModel);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sales`);
        if (!response.ok) throw new Error('Data fetch failed');
        const jsonData = await response.json();
        
        const rows = jsonData.map(row => ({
          ...row,
          revenue: parseFloat(row.revenue || 0),
          cost: parseFloat(row.cost || 0),
          orders: parseInt(row.orders || 0, 10),
          visitors: parseInt(row.visitors || 0, 10),
          customers: parseInt(row.customers || 0, 10),
        }));
        
        setData(rows);
        
        if (rows.length > 0) {
          const dates = rows.map(r => r.date).sort();
          setDateRange({
            start: dates[0],
            end: dates[dates.length - 1]
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter Logic
  const products = useMemo(() => ['All', ...new Set(data.map(item => item.product))], [data]);
  const channels = useMemo(() => ['All', ...new Set(data.map(item => item.channel))], [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const dateMatch = (!dateRange.start || item.date >= dateRange.start) && 
                        (!dateRange.end || item.date <= dateRange.end);
      const productMatch = productFilter === 'All' || item.product === productFilter;
      const channelMatch = channelFilter === 'All' || item.channel === channelFilter;
      return dateMatch && productMatch && channelMatch;
    });
  }, [data, dateRange, productFilter, channelFilter]);

  // Derived KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalCost = 0;

    filteredData.forEach(row => {
      totalRevenue += row.revenue;
      totalOrders += row.orders;
      totalCost += row.cost;
    });

    return {
      revenue: totalRevenue,
      orders: totalOrders,
      profit: totalRevenue - totalCost,
      aov: totalOrders > 0 ? totalRevenue / totalOrders : 0
    };
  }, [filteredData]);

  // Deterministic Insights
  const quickInsights = useMemo(() => {
    if (filteredData.length === 0) return null;

    const prodRev = filteredData.reduce((acc, r) => {
      acc[r.product] = (acc[r.product] || 0) + r.revenue;
      return acc;
    }, {});
    const bestProduct = Object.entries(prodRev).sort((a,b) => b[1]-a[1])[0][0];

    const chanRev = filteredData.reduce((acc, r) => {
      acc[r.channel] = (acc[r.channel] || 0) + r.revenue;
      return acc;
    }, {});
    const bestChannel = Object.entries(chanRev).sort((a,b) => b[1]-a[1])[0][0];

    const dateRev = filteredData.reduce((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + r.revenue;
      return acc;
    }, {});
    const peakDay = Object.entries(dateRev).sort((a,b) => b[1]-a[1])[0][0];

    const chanConv = filteredData.reduce((acc, r) => {
      if (!acc[r.channel]) acc[r.channel] = { orders: 0, visitors: 0 };
      acc[r.channel].orders += r.orders;
      acc[r.channel].visitors += r.visitors;
      return acc;
    }, {});
    const bestConv = Object.entries(chanConv)
      .map(([name, stats]) => ({ name, rate: stats.visitors > 0 ? stats.orders / stats.visitors : 0 }))
      .sort((a,b) => b.rate - a.rate)[0];

    return {
      bestProduct,
      bestChannel,
      peakDay,
      bestConv: bestConv.name,
      convRate: (bestConv.rate * 100).toFixed(1) + '%'
    };
  }, [filteredData]);

  // AI Insight Generation
  const generateAIInsights = async () => {
    if (!apiKey) {
      alert("No API key detected in your .env configuration. Please add VITE_GEMINI_API_KEY to your .env file.");
      return;
    }

    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: selectedModel });

      const prompt = `
        You are a business data analyst for a SaaS dashboard. 
        Analyze these metrics:
        - Total Revenue: ${formatCurrency(kpis.revenue)}
        - Net Profit: ${formatCurrency(kpis.profit)}
        - Avg Order Value: ${formatCurrency(kpis.aov)}
        - Best Channel: ${quickInsights.bestChannel}
        - Best Product: ${quickInsights.bestProduct}
        - Top Conversion: ${quickInsights.bestConv} (${quickInsights.convRate})
        
        Provide professional, clear, and short insights in JSON format. 
        Categories: alerts (negative/concerning - min 1), opportunities (positive/growth - min 1), suggestions (actionable steps - min 2).
        Each category is an array of strings. Keep business language simple.
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        setAiInsights(JSON.parse(jsonMatch[0]));
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    } catch (err) {
      console.error(err);
      alert("AI Generation failed. Check your API Key connectivity and network.");
    } finally {
      setIsGenerating(false);
    }
  };

  const revenueTrendData = useMemo(() => {
    const daily = filteredData.reduce((acc, row) => {
      acc[row.date] = (acc[row.date] || 0) + row.revenue;
      return acc;
    }, {});
    return Object.keys(daily).sort().map(date => ({ date, revenue: daily[date] }));
  }, [filteredData]);

  const revenueByChannelData = useMemo(() => {
    const byChannel = filteredData.reduce((acc, row) => {
      acc[row.channel] = (acc[row.channel] || 0) + row.revenue;
      return acc;
    }, {});
    return Object.keys(byChannel).map(channel => ({ name: channel, value: byChannel[channel] }));
  }, [filteredData]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { 
    style: 'currency', currency: 'USD', maximumFractionDigits: 0
  }).format(val);

  const formatNumber = (val) => new Intl.NumberFormat('en-US').format(val);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Elite Insights <Sparkles className="text-brand-500 w-8 h-8" />
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Next-gen analytical intelligence for your business.</p>
          </div>
          <div className="flex items-center gap-3">
            {apiKey ? (
              <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-2 text-emerald-600 font-bold group">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] uppercase tracking-wider">AI Connected</span>
              </div>
            ) : (
              <div className="bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 shadow-sm flex items-center gap-2 text-rose-600 font-bold">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] uppercase tracking-wider">AI Offline</span>
              </div>
            )}
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-slate-600 font-bold">
              <Calendar className="w-4 h-4 text-brand-500" />
              <span className="text-xs">{dateRange.start} – {dateRange.end}</span>
            </div>
          </div>
        </header>



        {/* Filters Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 text-brand-500">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Global Filters</span>
          </div>
          
          <div className="flex flex-1 flex-wrap gap-4">
            <div className="space-y-1 group">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 group-hover:text-brand-500 transition-colors">Product</label>
              <select 
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-brand-500 bg-slate-50/50"
              >
                {products.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            
            <div className="space-y-1 group">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 group-hover:text-brand-500 transition-colors">Channel</label>
              <select 
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-xl focus:ring-brand-500 bg-slate-50/50"
              >
                {channels.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button 
            onClick={() => {
              setProductFilter('All'); setChannelFilter('All');
              const dates = data.map(r => r.date).sort();
              setDateRange({ start: dates[0], end: dates[dates.length-1] });
            }}
            className="text-xs font-black uppercase text-slate-400 hover:text-brand-600 transition-colors"
          >
            Reset
          </button>
        </section>

        {/* Deterministic Data Insights Cards */}
        {quickInsights && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InsightStatCard label="Dominant Product" value={quickInsights.bestProduct} icon={<Crown className="w-4 h-4 text-amber-500"/>} bg="bg-amber-50" />
            <InsightStatCard label="Power Channel" value={quickInsights.bestChannel} icon={<Trophy className="w-4 h-4 text-blue-500"/>} bg="bg-blue-50" />
            <InsightStatCard label="Highest Rev Day" value={quickInsights.peakDay} icon={<Zap className="w-4 h-4 text-yellow-500"/>} bg="bg-yellow-50" />
            <InsightStatCard label="Conversion Hero" value={quickInsights.bestConv} subtext={quickInsights.convRate} icon={<Target className="w-4 h-4 text-emerald-500"/>} bg="bg-emerald-50" />
          </div>
        )}

        {/* AI Insight Row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-slate-200/50 flex flex-col justify-between overflow-hidden relative group border border-white/10">
            <div className="relative z-10">
              <div className="bg-brand-500/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-brand-400/30">
                <Sparkles className="w-6 h-6 text-brand-400" />
              </div>
              <h2 className="text-3xl font-black mb-3 leading-tight tracking-tight">AI Business<br/>Intelligence</h2>
              <p className="text-slate-300 text-sm font-semibold leading-relaxed">Leverage Gemini to identify risks and hidden opportunities in your current dataset.</p>
            </div>
            
            <button 
              onClick={generateAIInsights}
              disabled={isGenerating}
              className={`relative z-10 mt-8 w-full font-black py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${apiKey ? 'bg-brand-500 text-white hover:bg-brand-400 hover:shadow-brand-500/25' : 'bg-white/10 text-white cursor-not-allowed border border-white/20 backdrop-blur-sm'}`}
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <>
                  {apiKey ? 'Generate Analytics' : 'Connect API in .env'} 
                  {apiKey && <ArrowUpRight className="w-4 h-4 font-black" />}
                </>
              )}
            </button>

            {/* Decorative background elements */}
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-brand-400/20 rounded-full blur-2xl"></div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {aiInsights ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                <AIRow label="Alerts" data={aiInsights.alerts} icon={<AlertCircle className="w-4 h-4" />} accent="text-rose-500" bg="bg-rose-50" border="border-rose-100" />
                <AIRow label="Opportunities" data={aiInsights.opportunities} icon={<Zap className="w-4 h-4" />} accent="text-brand-500" bg="bg-brand-50" border="border-brand-100" />
                <AIRow label="Suggestions" data={aiInsights.suggestions} icon={<Lightbulb className="w-4 h-4" />} accent="text-amber-500" bg="bg-amber-50" border="border-amber-100" />
              </div>
            ) : (
              <div className="h-full bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  {apiKey ? <BarChart3 className="w-8 h-8 text-brand-500 opacity-40 animate-pulse" /> : <Lock className="w-8 h-8 opacity-20" />}
                </div>
                <p className="text-sm font-bold uppercase tracking-widest mb-1">
                  {apiKey ? 'Ready for Analysis' : 'Configuration Required'}
                </p>
                <p className="max-w-[280px] text-xs leading-relaxed">
                  {apiKey 
                    ? 'Click generate to analyze your data with Gemini AI.' 
                    : 'Key entry disabled for security. Please set VITE_GEMINI_API_KEY in your root .env file.'
                  }
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Global Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Total Revenue" value={formatCurrency(kpis.revenue)} icon={<DollarSign className="w-5 h-5 text-brand-600" />} accent="brand" />
          <KpiCard title="Total Orders" value={formatNumber(kpis.orders)} icon={<ShoppingCart className="w-5 h-5 text-blue-600" />} accent="blue" />
          <KpiCard title="Net Profit" value={formatCurrency(kpis.profit)} icon={<TrendingUp className="w-5 h-5 text-emerald-600" />} accent="emerald" />
          <KpiCard title="Avg Order Value" value={formatCurrency(kpis.aov)} icon={<Users className="w-5 h-5 text-purple-600" />} accent="purple" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Trend */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-brand-500" /> Revenue Trend
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market Channels */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Market Channels
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByChannelData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                    {revenueByChannelData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Components
const KpiCard = ({ title, value, icon, accent = "brand" }) => (
  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
    <div className="flex justify-between items-start">
      <div className="space-y-3">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</p>
        <h3 className={`text-3xl font-black text-slate-900 group-hover:text-${accent}-600 transition-colors tracking-tight`}>{value}</h3>
      </div>
      <div className={`bg-${accent}-50 p-4 rounded-2xl group-hover:bg-${accent}-100 group-hover:scale-110 transition-all duration-300`}>
        {icon}
      </div>
    </div>
  </div>
);

const InsightStatCard = ({ label, value, icon, bg, subtext }) => (
  <div className={`rounded-2xl p-4 border border-slate-200 shadow-sm bg-white flex items-center gap-4 group hover:border-slate-300 transition-all`}>
    <div className={`${bg} p-3 rounded-xl transition-transform group-hover:rotate-12`}>
      {icon}
    </div>
    <div className="overflow-hidden">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
      <h4 className="text-sm font-black text-slate-800 truncate">{value}</h4>
      {subtext && <p className="text-[10px] font-bold text-slate-500 mt-0.5">{subtext}</p>}
    </div>
  </div>
);

const AIRow = ({ label, data, icon, accent, bg, border }) => (
  <div className={`flex flex-col h-full bg-white border ${border} rounded-3xl overflow-hidden shadow-sm`}>
    <div className={`${bg} ${accent} px-5 py-3 flex items-center gap-2 border-b ${border}`}>
      {icon}
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className="p-5 flex-1 space-y-3">
      {data.map((item, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${accent.replace('text', 'bg')}`}></div>
          <p className="text-xs font-medium text-slate-600 leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  </div>
);

export default Dashboard;

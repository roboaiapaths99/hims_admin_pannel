import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Star, MessageSquare, BarChart3, Filter, Send } from 'lucide-react';

interface FeedbackEntry {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  rating: number;
  comments: string | null;
  category: string | null;
  created_at: string;
}

interface FeedbackStats {
  total_responses: number;
  overall_avg_rating: number;
  by_category: {
    category: string;
    avg_rating: number;
    count: number;
    distribution: Record<string, number>;
  }[];
}

const categories = ['overall', 'doctor', 'staff', 'facility', 'food'];

const FeedbackDashboard: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'responses'>('stats');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRating, setFilterRating] = useState<number | ''>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterCategory) params.category = filterCategory;
      if (filterRating) params.rating = filterRating;
      const [fbRes, statsRes] = await Promise.all([
        apiClient.get('/api/portal/feedback', { params }),
        apiClient.get('/api/portal/feedback/stats')
      ]);
      setFeedbacks(fbRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterCategory, filterRating]);

  const renderStars = (rating: number, size = 'h-4 w-4') => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${size} ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const ratingColor = (avg: number) => {
    if (avg >= 4) return 'text-emerald-600';
    if (avg >= 3) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-indigo-600" />
          Patient Feedback
        </h1>
        <p className="text-sm text-slate-500 mt-1">View patient satisfaction surveys and ratings</p>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Responses</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total_responses}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Rating</p>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-3xl font-bold ${ratingColor(stats.overall_avg_rating)}`}>
                {stats.overall_avg_rating}
              </span>
              {renderStars(Math.round(stats.overall_avg_rating), 'h-5 w-5')}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categories Tracked</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stats.by_category.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 max-w-xs">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'stats' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Analytics
        </button>
        <button
          onClick={() => setActiveTab('responses')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'responses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="h-4 w-4" /> Responses
        </button>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.by_category.map(cat => (
            <div key={cat.category} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 capitalize">{cat.category}</h3>
                <span className={`text-lg font-bold ${ratingColor(cat.avg_rating)}`}>
                  {cat.avg_rating} / 5
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{cat.count} response(s)</p>

              {/* Rating Distribution Bars */}
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map(r => {
                  const count = cat.distribution[String(r)] || 0;
                  const pct = cat.count > 0 ? Math.round((count / cat.count) * 100) : 0;
                  return (
                    <div key={r} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-right font-semibold text-slate-500">{r}</span>
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            r >= 4 ? 'bg-emerald-500' : r >= 3 ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-slate-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Responses Tab */}
      {activeTab === 'responses' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : '')}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
              >
                <option value="">All Ratings</option>
                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Feedback Cards */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading feedback responses...</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              No feedback responses found
            </div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map(fb => (
                <div key={fb.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {renderStars(fb.rating)}
                        {fb.category && (
                          <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded capitalize">
                            {fb.category}
                          </span>
                        )}
                      </div>
                      {fb.comments ? (
                        <p className="text-sm text-slate-700 leading-relaxed">"{fb.comments}"</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No comments provided</p>
                      )}
                      {fb.patient_name && (
                        <p className="text-xs text-slate-500 mt-2 font-medium">— {fb.patient_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{formatDate(fb.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackDashboard;

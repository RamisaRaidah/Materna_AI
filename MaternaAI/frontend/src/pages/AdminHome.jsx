import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  AlertTriangle,
  Brain,
  Circle,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  buildRegistrationChartData,
  buildAiChatChartData,
  buildRiskChartData,
  buildAlertTypeChartData,
  buildAlertStatusChartData,
  buildSosWeekChartData,
  CHART_COLORS,
} from '../utils/adminChartData';

const EMPTY_DASHBOARD = {
  stats: {
    total_patients: 0,
    doctors: { total: 0, pending: 0, approved: 0, rejected: 0 },
    ai_chat_sessions_today: 0,
    high_critical_risk_patients: 0,
    pending_community_posts: 0,
  },
  platform_health: {
    risk_assessments_today: 0,
    sos_alerts_this_week: 0,
    unacknowledged_clinician_alerts: 0,
  },
  recent_activity: [],
  online_users: { patients: [], clinicians: [], patient_count: 0, clinician_count: 0 },
  presence_threshold_minutes: 2,
  charts: {
    registrations_7d: [],
    risk_distribution: [],
    alerts_by_type_week: [],
    alert_status_breakdown: { open: 0, assigned: 0, resolved: 0 },
    ai_chat_7d: [],
    sos_daily_week: [],
  },
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const activityIcon = (type) => {
  if (type === 'registration') return UserPlus;
  if (type === 'risk_escalation') return AlertTriangle;
  if (type === 'sos') return Zap;
  return Activity;
};

const activityColor = (type) => {
  if (type === 'registration') return 'text-info bg-info/10';
  if (type === 'risk_escalation') return 'text-warning bg-warning/10';
  if (type === 'sos') return 'text-danger bg-danger/10';
  return 'text-primary-mauve bg-primary-mauve/10';
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-primary-mauve/15 rounded-xl px-3 py-2 shadow-premium text-xs">
      <p className="font-black text-text-dark mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="font-semibold text-text-muted">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          {entry.value}
        </p>
      ))}
    </div>
  );
};

const AdminHome = () => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const data = await adminAPI.getDashboard();
      setDashboard({ ...EMPTY_DASHBOARD, ...data, charts: { ...EMPTY_DASHBOARD.charts, ...data.charts } });
      setError('');
    } catch (err) {
      console.error(err);
      if (!silent) {
        setError(err?.response?.data?.error || 'Failed to load admin dashboard.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadDashboard();
    const pollId = setInterval(() => {
      if (active) loadDashboard({ silent: true });
    }, 15000);
    return () => {
      active = false;
      clearInterval(pollId);
    };
  }, []);

  const { stats, platform_health, recent_activity, online_users, charts } = dashboard;

  const registrationData = useMemo(
    () => buildRegistrationChartData(charts.registrations_7d),
    [charts.registrations_7d]
  );
  const aiChatData = useMemo(() => buildAiChatChartData(charts.ai_chat_7d), [charts.ai_chat_7d]);
  const riskData = useMemo(() => buildRiskChartData(charts.risk_distribution), [charts.risk_distribution]);
  const alertTypeData = useMemo(
    () => buildAlertTypeChartData(charts.alerts_by_type_week),
    [charts.alerts_by_type_week]
  );
  const alertStatusData = useMemo(
    () => buildAlertStatusChartData(charts.alert_status_breakdown),
    [charts.alert_status_breakdown]
  );
  const sosWeekData = useMemo(() => buildSosWeekChartData(charts.sos_daily_week), [charts.sos_daily_week]);

  const clinicianStatusData = useMemo(() => [
    { name: 'Approved', value: stats.doctors.approved, fill: CHART_COLORS.success },
    { name: 'Pending', value: stats.doctors.pending, fill: CHART_COLORS.warning },
    { name: 'Rejected', value: stats.doctors.rejected, fill: CHART_COLORS.danger },
  ].filter((item) => item.value > 0), [stats.doctors]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="bg-white rounded-2xl p-6 border border-primary-mauve/10 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-mauve mb-1">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Admin Console</span>
          </div>
          <h1 className="text-2xl font-black text-text-dark">Platform Dashboard</h1>
          <p className="text-xs font-semibold text-text-muted mt-1">
            Logged in as <span className="text-primary-mauve font-black">{user?.name}</span> · Live overview of MaternaAI activity.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-3 shrink-0">
          <Link
            to="/admin/review-doctors"
            className="px-4 py-2.5 rounded-xl border border-primary-mauve/10 text-xs font-black text-primary-mauve hover:bg-primary-mauve/5 transition-all"
          >
            REVIEW DOCTORS
          </Link>
          <Link
            to="/admin/community-moderation"
            className="px-4 py-2.5 rounded-xl border border-primary-mauve/10 text-xs font-black text-primary-mauve hover:bg-primary-mauve/5 transition-all flex items-center gap-2"
          >
            MODERATE POSTS
            {stats.pending_community_posts > 0 && (
              <span className="bg-danger text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {stats.pending_community_posts}
              </span>
            )}
          </Link>
          <button
            onClick={() => loadDashboard()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary-mauve/10 text-xs font-black text-primary-mauve hover:bg-primary-mauve/5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-bold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider pl-1 mb-3">Platform Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Registered Patients" value={stats.total_patients} tone="primary" />
          <StatCard
            icon={Stethoscope}
            label="Registered Clinicians"
            value={stats.doctors.total}
            sub={`${stats.doctors.pending} pending · ${stats.doctors.approved} approved · ${stats.doctors.rejected} rejected`}
            tone="info"
          />
          <StatCard icon={Brain} label="AI Chat Sessions Today" value={stats.ai_chat_sessions_today} tone="success" />
          <StatCard icon={AlertTriangle} label="High / Critical Risk Now" value={stats.high_critical_risk_patients} tone="danger" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider pl-1 mb-3">Platform Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard icon={Activity} label="Risk Assessments Today" value={platform_health.risk_assessments_today} tone="primary" />
          <StatCard icon={Zap} label="SOS Alerts This Week" value={platform_health.sos_alerts_this_week} tone="danger" />
          <StatCard
            icon={UserCheck}
            label="Unacknowledged Clinician Alerts"
            value={platform_health.unacknowledged_clinician_alerts}
            sub="Open alerts awaiting clinician response"
            tone="warning"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider pl-1 mb-3">Insights & Trends</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard title="New Registrations" subtitle="Patients and clinicians over the last 7 days">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={registrationData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(171,115,151,0.12)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                <Bar dataKey="patients" name="Patients" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="clinicians" name="Clinicians" fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="AI Chat Engagement" subtitle="Distinct patient sessions per day">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={aiChatData}>
                <defs>
                  <linearGradient id="aiChatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(171,115,151,0.12)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="sessions" name="Sessions" stroke={CHART_COLORS.success} fill="url(#aiChatGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Patient Risk Distribution" subtitle="Current risk profiles across the platform">
            {riskData.length === 0 ? (
              <EmptyChart message="No risk profiles computed yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Clinician Verification Status" subtitle="Breakdown of clinician accounts">
            {clinicianStatusData.length === 0 ? (
              <EmptyChart message="No clinicians registered yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={clinicianStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {clinicianStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Alerts This Week" subtitle="Volume by alert type">
            {alertTypeData.length === 0 ? (
              <EmptyChart message="No alerts recorded this week" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={alertTypeData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(171,115,151,0.12)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" width={90} tick={{ fontSize: 9, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Alerts" fill={CHART_COLORS.warning} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Alert Response Pipeline" subtitle="Open vs assigned vs resolved">
            {alertStatusData.length === 0 ? (
              <EmptyChart message="No alert data available" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={alertStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {alertStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="SOS Activity This Week" subtitle="Daily SOS triggers since Monday" className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sosWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(171,115,151,0.12)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART_COLORS.muted }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sos" name="SOS Alerts" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <OnlinePanel
          title="Patients Online Now"
          count={online_users.patient_count}
          users={online_users.patients}
          emptyLabel="No patients online right now"
          threshold={dashboard.presence_threshold_minutes}
        />
        <OnlinePanel
          title="Clinicians Online Now"
          count={online_users.clinician_count}
          users={online_users.clinicians}
          emptyLabel="No clinicians online right now"
          threshold={dashboard.presence_threshold_minutes}
        />
      </div>

      <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium overflow-hidden">
        <div className="p-5 border-b border-primary-mauve/10 bg-bg-rose-white">
          <h2 className="text-sm font-black text-text-dark uppercase tracking-wider">Recent Activity Feed</h2>
          <p className="text-[10px] font-semibold text-text-muted mt-1">Registrations, risk escalations, and SOS triggers</p>
        </div>
        {loading && recent_activity.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-primary-mauve animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-text-muted">Loading activity feed...</p>
          </div>
        ) : recent_activity.length === 0 ? (
          <div className="p-12 text-center text-sm font-semibold text-text-muted">No recent platform activity yet.</div>
        ) : (
          <div className="divide-y divide-primary-mauve/10 max-h-96 overflow-y-auto">
            {recent_activity.map((item) => {
              const Icon = activityIcon(item.type);
              return (
                <div key={`${item.type}-${item.id}-${item.created_at}`} className="p-4 flex items-start gap-3 hover:bg-bg-rose-white/60 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activityColor(item.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black text-text-dark truncate">{item.title}</p>
                      <span className="text-[10px] font-bold text-text-muted shrink-0">{formatRelativeTime(item.created_at)}</span>
                    </div>
                    <p className="text-xs font-semibold text-text-muted mt-0.5">{item.subtitle}</p>
                    {item.meta && (
                      <p className="text-[10px] font-bold text-primary-mauve uppercase tracking-wider mt-1">{item.meta}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-primary-mauve/10 shadow-premium p-5 ${className}`}>
    <div className="mb-4">
      <h3 className="text-xs font-black text-text-dark uppercase tracking-wider">{title}</h3>
      <p className="text-[10px] font-semibold text-text-muted mt-0.5">{subtitle}</p>
    </div>
    {children}
  </div>
);

const EmptyChart = ({ message }) => (
  <div className="h-[220px] flex items-center justify-center text-xs font-semibold text-text-muted">{message}</div>
);

const StatCard = ({ icon: Icon, label, value, sub, tone = 'primary' }) => {
  const toneClasses = {
    primary: 'bg-primary-mauve/10 text-primary-mauve',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-primary-mauve/10 shadow-premium flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-text-dark mt-0.5">{value ?? 0}</p>
        {sub && <p className="text-[10px] font-semibold text-text-muted mt-1 leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
};

const OnlinePanel = ({ title, count, users, emptyLabel, threshold }) => (
  <div className="bg-white rounded-2xl border border-primary-mauve/10 shadow-premium overflow-hidden">
    <div className="p-5 border-b border-primary-mauve/10 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-black text-text-dark uppercase tracking-wider">{title}</h2>
        <p className="text-[10px] font-semibold text-text-muted mt-1">Active within last {threshold} minutes</p>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success">
        <Circle className="w-2.5 h-2.5 fill-current" />
        <span className="text-xs font-black">{count}</span>
      </div>
    </div>
    {users.length === 0 ? (
      <div className="p-8 text-center text-xs font-semibold text-text-muted">{emptyLabel}</div>
    ) : (
      <div className="divide-y divide-primary-mauve/10 max-h-72 overflow-y-auto">
        {users.map((onlineUser) => (
          <div key={onlineUser.id} className="p-4 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-secondary-blush/20 flex items-center justify-center text-lg">
                {onlineUser.role === 'clinician' ? '🩺' : '🤰'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-text-dark truncate">{onlineUser.name}</p>
              <p className="text-[10px] font-semibold text-text-muted truncate">
                {[onlineUser.area, onlineUser.district].filter(Boolean).join(', ') || onlineUser.phone}
              </p>
            </div>
            <span className="text-[10px] font-bold text-success shrink-0">{formatRelativeTime(onlineUser.last_seen_at)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default AdminHome;

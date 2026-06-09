export const CHART_COLORS = {
  primary: '#ab7397',
  blush: '#e1a4c4',
  success: '#3aa673',
  danger: '#d93d59',
  warning: '#e69d30',
  info: '#3d8ed9',
  purple: '#8652cc',
  muted: '#725b68',
};

const RISK_COLORS = {
  Low: CHART_COLORS.success,
  Medium: CHART_COLORS.warning,
  High: CHART_COLORS.danger,
  Critical: '#b91c1c',
  Unknown: CHART_COLORS.muted,
};

export function buildLast7DayKeys() {
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}

export function formatShortDay(isoDay) {
  const date = new Date(`${isoDay}T12:00:00`);
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}

export function buildRegistrationChartData(raw = []) {
  return buildLast7DayKeys().map((day) => {
    const patients = raw.find((row) => row.day?.startsWith(day) && row.role === 'patient');
    const clinicians = raw.find((row) => row.day?.startsWith(day) && row.role === 'clinician');
    return {
      day: formatShortDay(day),
      patients: Number(patients?.count || 0),
      clinicians: Number(clinicians?.count || 0),
    };
  });
}

export function buildAiChatChartData(raw = []) {
  return buildLast7DayKeys().map((day) => {
    const match = raw.find((row) => row.day?.startsWith(day));
    return {
      day: formatShortDay(day),
      sessions: Number(match?.sessions || 0),
    };
  });
}

export function buildRiskChartData(raw = []) {
  return raw.map((row) => ({
    name: row.risk_level,
    value: Number(row.count || 0),
    fill: RISK_COLORS[row.risk_level] || CHART_COLORS.muted,
  }));
}

export function buildAlertTypeChartData(raw = []) {
  return raw.slice(0, 8).map((row) => ({
    type: (row.alert_type || 'other').replace(/_/g, ' '),
    count: Number(row.count || 0),
  }));
}

export function buildAlertStatusChartData(breakdown = {}) {
  return [
    { name: 'Open', value: Number(breakdown.open || 0), fill: CHART_COLORS.danger },
    { name: 'Assigned', value: Number(breakdown.assigned || 0), fill: CHART_COLORS.warning },
    { name: 'Resolved', value: Number(breakdown.resolved || 0), fill: CHART_COLORS.success },
  ].filter((item) => item.value > 0);
}

export function buildSosWeekChartData(raw = []) {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const dayOfWeek = weekStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    days.push(date.toISOString().split('T')[0]);
  }

  return days.map((day) => {
    const match = raw.find((row) => row.day?.startsWith(day));
    return {
      day: formatShortDay(day),
      sos: Number(match?.count || 0),
    };
  });
}

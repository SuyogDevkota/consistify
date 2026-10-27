import { useCallback, useEffect, useState } from 'react';
import { groupsApi, getErrorMessage } from '../services/api';
import { useToast } from './useToast';

/**
 * Loads authenticated dashboard data for the active group.
 * All scores/analytics come from the API — never computed client-side as authority.
 */
export default function useDashboardData({
  groupId,
  view,
  chartMode,
  chartRange,
  period,
  calDate,
}) {
  const { toast } = useToast();
  const [summary, setSummary] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [activity, setActivity] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [chartData, setChartData] = useState({ dates: [], series: [] });
  const [dailyChart, setDailyChart] = useState({ dates: [], series: [] });
  const [cumChart, setCumChart] = useState({ dates: [], series: [] });
  const [categoryStats, setCategoryStats] = useState([]);
  const [calendar, setCalendar] = useState({ days: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const [sum, check, act, board, cats, mems] = await Promise.all([
        groupsApi.summary(groupId),
        groupsApi.checklist(groupId),
        groupsApi.activity(groupId, 8),
        groupsApi.leaderboard(groupId, period),
        groupsApi.categories(groupId),
        groupsApi.members(groupId),
      ]);
      setSummary(sum.data.data);
      setChecklist(check.data.data);
      setActivity(act.data.data.activity);
      setLeaderboard(board.data.data.leaderboard);
      setCategories(cats.data.data.categories);
      setMembers(mems.data.data.members);
      setPending(mems.data.data.pending || []);

      const chartFn = chartMode === 'daily' ? groupsApi.daily : groupsApi.cumulative;
      const chart = await chartFn(groupId, chartRange);
      setChartData(chart.data.data);

      if (view === 'progress') {
        const [d, c, catStats] = await Promise.all([
          groupsApi.daily(groupId, chartRange),
          groupsApi.cumulative(groupId, chartRange),
          groupsApi.categoryStats(groupId, chartRange),
        ]);
        setDailyChart(d.data.data);
        setCumChart(c.data.data);
        setCategoryStats(catStats.data.data.categories || []);
      }
      if (view === 'calendar') {
        const cal = await groupsApi.calendar(groupId, calDate.year, calDate.month);
        setCalendar(cal.data.data);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast(msg);
    } finally {
      setLoading(false);
    }
  }, [groupId, chartMode, chartRange, period, view, calDate, toast]);

  const refreshAfterTask = useCallback(async () => {
    if (!groupId) return;
    try {
      if (view === 'dashboard') {
        const chartFn = chartMode === 'daily' ? groupsApi.daily : groupsApi.cumulative;
        const [check, sum, act, board, chart] = await Promise.all([
          groupsApi.checklist(groupId),
          groupsApi.summary(groupId),
          groupsApi.activity(groupId, 8),
          groupsApi.leaderboard(groupId, period),
          chartFn(groupId, chartRange),
        ]);
        setChecklist(check.data.data);
        setSummary(sum.data.data);
        setActivity(act.data.data.activity);
        setLeaderboard(board.data.data.leaderboard);
        setChartData(chart.data.data);
        return;
      }

      const check = await groupsApi.checklist(groupId);
      setChecklist(check.data.data);
    } catch (err) {
      toast(getErrorMessage(err));
    }
  }, [groupId, view, chartMode, chartRange, period, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    summary,
    checklist,
    activity,
    leaderboard,
    categories,
    members,
    pending,
    chartData,
    dailyChart,
    cumChart,
    categoryStats,
    calendar,
    loading,
    error,
    refresh,
    refreshAfterTask,
  };
}

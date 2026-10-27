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
  userId,
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

  const optimisticallyUpdateTask = useCallback((task, undo) => {
    const previousState = {
      checklist,
      chartData,
      dailyChart,
      cumChart,
    };
    const previousCount = task.completionCount ?? (task.completed ? 1 : 0);
    const nextCount = Math.max(0, previousCount + (undo ? -1 : 1));
    const nextCompleted = nextCount >= (task.dailyLimit || 1);
    const completionDelta = Number(nextCompleted) - Number(task.completed);
    const pointsDelta = (undo ? -1 : 1) * task.points;
    const dateKey = checklist?.dateKey;

    if (checklist) {
      setChecklist({
        ...checklist,
        pointsToday: Math.max(0, checklist.pointsToday + pointsDelta),
        completedCount: Math.max(0, checklist.completedCount + completionDelta),
        tasks: checklist.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                completionCount: nextCount,
                completed: nextCompleted,
                pointsAwarded: Math.max(0, item.pointsAwarded + pointsDelta),
                latestOccurrence: undo
                  ? (nextCount ? (item.latestOccurrence || 1) - 1 : null)
                  : (item.latestOccurrence || 0) + 1,
              }
            : item
        ),
      });
    }

    const updateSeries = (chart, mode) => {
      const dateIndex = chart.dates.indexOf(dateKey);
      if (!userId || dateIndex < 0) return chart;
      return {
        ...chart,
        series: chart.series.map((series) => {
          if (series.userId !== userId) return series;
          const daily = [...(series.daily || series.values)];
          daily[dateIndex] = Math.max(0, (daily[dateIndex] || 0) + pointsDelta);
          const values = mode === 'cumulative'
            ? series.values.map((value, index) =>
                index >= dateIndex ? Math.max(0, value + pointsDelta) : value
              )
            : daily;
          return { ...series, daily, values };
        }),
      };
    };

    setChartData((current) => updateSeries(current, current.mode));
    setDailyChart((current) => updateSeries(current, 'daily'));
    setCumChart((current) => updateSeries(current, 'cumulative'));

    return previousState;
  }, [checklist, chartData, dailyChart, cumChart, userId]);

  const restoreChecklist = useCallback((previousState) => {
    if (!previousState) return;
    if (previousState.checklist) setChecklist(previousState.checklist);
    setChartData(previousState.chartData);
    setDailyChart(previousState.dailyChart);
    setCumChart(previousState.cumChart);
  }, []);

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
    optimisticallyUpdateTask,
    restoreChecklist,
  };
}

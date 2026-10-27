import * as analyticsService from '../services/analyticsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dailySeries = asyncHandler(async (req, res) => {
  const data = await analyticsService.getPointsSeries(req.group, {
    range: req.query.range,
    mode: 'daily',
  });
  res.json({ success: true, data });
});

export const cumulativeSeries = asyncHandler(async (req, res) => {
  const data = await analyticsService.getPointsSeries(req.group, {
    range: req.query.range,
    mode: 'cumulative',
  });
  res.json({ success: true, data });
});

export const leaderboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getLeaderboard(req.group, {
    period: req.query.period || 'all',
  });
  res.json({ success: true, data });
});

export const streaks = asyncHandler(async (req, res) => {
  const data = await analyticsService.getStreakInfo(req.group, req.user._id);
  res.json({ success: true, data });
});

export const categories = asyncHandler(async (req, res) => {
  const data = await analyticsService.getCategoryStats(req.group, {
    range: req.query.range,
  });
  res.json({ success: true, data });
});

export const summary = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardSummary(req.group, req.user);
  res.json({ success: true, data });
});

export const periodSummary = asyncHandler(async (req, res) => {
  const data = await analyticsService.getWeeklyMonthlySummary(req.group, req.user._id);
  res.json({ success: true, data });
});

export const calendar = asyncHandler(async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  const data = await analyticsService.getCalendarMonth(req.group, req.user._id, year, month);
  res.json({ success: true, data });
});

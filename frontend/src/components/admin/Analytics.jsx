import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import Sidebar from '../shared/Sidebar';
import '../../styles/admin.css';
import '../../styles/global.css';

const parseHourSortKey = (hourLabel) => {
  const match = String(hourLabel || '').match(/^(\d{1,2})/);
  return match ? Number(match[1]) : 0;
};

const getPeakBadgeColor = (level) => {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'high') return '#EF4444';
  if (normalized === 'medium') return 'var(--color-yellow)';
  return 'var(--color-green-light)';
};

const Analytics = ({ onNavigate, goBack, currentPage }) => {
  const [analyticsData, setAnalyticsData] = useState({
    queueTrends: [],
    peakHours: [],
    servicePopularity: []
  });
  const [mlModelStats, setMlModelStats] = useState(null);
  const [predictions, setPredictions] = useState({ peakTimes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const getAuthConfig = () => ({
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      try {
        const queueRes = await axios.get(`${API_BASE_URL}/api/queue`, getAuthConfig());
        const queues = queueRes.data || [];

        const trends = {};
        queues.forEach(q => {
          const hour = new Date(q.createdAt || Date.now()).getHours();
          const hourStr = `${String(hour).padStart(2, '0')}:00`;
          trends[hourStr] = (trends[hourStr] || 0) + 1;
        });

        const queueTrends = Object.entries(trends)
          .map(([hour, value]) => ({ hour, value }))
          .sort((a, b) => parseHourSortKey(a.hour) - parseHourSortKey(b.hour))
          .slice(-8);

        const peakHours = Object.entries(trends)
          .map(([hour, count]) => ({ hour, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        const serviceCount = {};
        queues.forEach(q => {
          serviceCount[q.service] = (serviceCount[q.service] || 0) + 1;
        });

        const servicePopularity = Object.entries(serviceCount)
          .map(([service, count]) => ({ service, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setAnalyticsData({
          queueTrends: queueTrends.length > 0 ? queueTrends : [],
          peakHours,
          servicePopularity: servicePopularity.length > 0 ? servicePopularity : []
        });

        axios.get(`${API_BASE_URL}/api/predictions`, getAuthConfig())
          .then((predsRes) => {
            setPredictions(predsRes.data || { peakTimes: [] });
            setMlModelStats(predsRes?.data?.mlModelStats || null);
          })
          .catch((err) => {
            console.warn('Could not fetch predictions:', err);
            setPredictions({ peakTimes: [] });
            setMlModelStats(null);
          });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const queueTrendMaxValue = Math.max(
    1,
    ...analyticsData.queueTrends.map((item) => Number(item.value) || 0)
  );

  const mlLive = Boolean(mlModelStats?.trained && !mlModelStats?.isSimulated);
  const mlBannerText = mlLive
    ? `Live ML forecasts updated ${mlModelStats?.lastUpdated ? new Date(mlModelStats.lastUpdated).toLocaleTimeString() : 'recently'}`
    : mlModelStats?.isSimulated
      ? 'Showing estimated insights from current queue volume (train ML for live models)'
      : 'Predictions appear after model training is complete';

  return (
    <div className="admin-layout">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} goBack={goBack} />
      <main className="admin-main">
        <div className="admin-header">
          <h1>Analytics & Reports</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
            Comprehensive analytics with ML-powered insights
          </p>
        </div>

        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #2563EB 100%)',
          color: 'var(--color-white)',
          marginBottom: '2rem',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>ML Model Performance</h3>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>
                {mlBannerText}
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => onNavigate('predictions')}
              style={{
                backgroundColor: 'var(--color-white)',
                color: 'var(--color-primary)',
                border: 'none'
              }}
            >
              View All Predictions
            </button>
          </div>
        </div>

        <div className="analytics-container">
          <div className="analytics-card">
            <h3 className="analytics-title">Queue Trends (Today)</h3>
            <div className="chart-container" style={{ paddingBottom: '2.5rem' }}>
              {analyticsData.queueTrends.length === 0 ? (
                <div style={{ width: '100%', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                  No queue activity recorded yet today
                </div>
              ) : (
                analyticsData.queueTrends.map((item, index) => {
                  const height = (item.value / queueTrendMaxValue) * 100;
                  return (
                    <div
                      key={`${item.hour}-${index}`}
                      className="chart-column"
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}
                    >
                      <div className="chart-bar" style={{ height: `${height}%`, width: '100%' }}>
                        <span className="chart-value">{item.value}</span>
                      </div>
                      <span className="chart-label-static">{item.hour}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: 'var(--color-primary)' }}></div>
                <span>Queue Count</span>
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <h3 className="analytics-title">Peak Hours (today, actual)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '120px' }}>
              {analyticsData.peakHours.length === 0 ? (
                <div style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                  No join timestamps yet — peak hours appear when customers join the queue.
                </div>
              ) : (
                analyticsData.peakHours.map((item, index) => (
                  <div key={`${item.hour}-${index}`} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: 'var(--color-gray-50)',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontWeight: 500 }}>{item.hour}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.count} joins</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="analytics-card">
            <h3 className="analytics-title">Service Popularity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {analyticsData.servicePopularity.map((item, index) => {
                const maxCount = Math.max(...analyticsData.servicePopularity.map(s => s.count));
                const width = (item.count / maxCount) * 100;
                return (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 500 }}>{item.service}</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.count}</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--color-gray-200)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${width}%`,
                        height: '100%',
                        background: 'linear-gradient(to right, var(--color-primary), #60A5FA)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="analytics-card">
            <h3 className="analytics-title">ML Predictions Summary</h3>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              Next 6 hours peak time predictions
            </div>
            {predictions.peakTimes && predictions.peakTimes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {predictions.peakTimes.slice(0, 6).map((item, index) => {
                  const peakSlice = predictions.peakTimes.slice(0, 6);
                  const maxCustomers = Math.max(...peakSlice.map(p => Number(p.customers) || 0), 1);
                  const customers = Number(item.customers) || 0;
                  const width = (customers / maxCustomers) * 100;
                  const color = getPeakBadgeColor(item.prediction);
                  return (
                    <div key={index} style={{
                      padding: '1rem',
                      backgroundColor: 'var(--color-gray-50)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{item.hour}</span>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                            {item.customers} customers
                          </span>
                          <span className="badge" style={{
                            backgroundColor: `${color}20`,
                            color: color,
                            textTransform: 'capitalize'
                          }}>
                            {item.prediction}
                          </span>
                          {Number.isFinite(item.confidence) && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                              {item.confidence}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: 'var(--color-gray-200)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${width}%`,
                          height: '100%',
                          backgroundColor: color,
                          borderRadius: '3px'
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                No predictions available yet
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;


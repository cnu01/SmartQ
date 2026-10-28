import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import {
  ClipboardList,
  Building2,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Brain,
  ArrowRight
} from 'lucide-react';
import Sidebar from '../shared/Sidebar';
import {
  computeAverageWaitMinutes,
  countWaitingQueues
} from '../../utils/queueWaitHelpers.mjs';
import '../../styles/admin.css';
import '../../styles/global.css';

const AdminDashboard = ({ onNavigate, goBack, currentPage }) => {
  const [stats, setStats] = useState({
    totalQueues: 0,
    activeCounters: 0,
    pendingEvents: 0,
    totalCustomers: 0,
    averageWaitTime: 0
  });
  const [predictions, setPredictions] = useState({ peakTimes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const getAuthConfig = () => ({
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      try {
        const [queueRes, eventsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/queue`, getAuthConfig()),
          axios.get(`${API_BASE_URL}/api/events`, getAuthConfig())
        ]);

        const queues = queueRes.data || [];
        const events = eventsRes.data || [];

        const waitingCount = countWaitingQueues(queues);
        const averageWaitTime = computeAverageWaitMinutes(queues);

        setStats({
          totalQueues: queues.length,
          activeCounters: Math.ceil(waitingCount / 5) || 0,
          pendingEvents: events.filter(e => e.status === 'Upcoming').length,
          totalCustomers: queues.length,
          averageWaitTime
        });

        // Fetch predictions in background so dashboard stats render immediately.
        axios.get(`${API_BASE_URL}/api/predictions`, getAuthConfig())
          .then((predsRes) => {
            setPredictions(predsRes.data || { peakTimes: [] });
          })
          .catch((err) => {
            console.warn('Could not fetch predictions:', err);
            setPredictions({ peakTimes: [] });
          });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    { label: 'Total Queues', value: stats.totalQueues, icon: <ClipboardList size={24} />, color: 'var(--color-primary)' },
    { label: 'Active Counters', value: stats.activeCounters, icon: <Building2 size={24} />, color: 'var(--color-green-light)' },
    { label: 'Pending Events', value: stats.pendingEvents, icon: <Calendar size={24} />, color: 'var(--color-yellow)' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: <Users size={24} />, color: '#8B5CF6' },
    { label: 'Avg Wait Time', value: `${stats.averageWaitTime} min`, icon: <Clock size={24} />, color: '#EF4444' }
  ];

  return (
    <div className="admin-layout">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} goBack={goBack} />
      <main className="admin-main">
        <div className="admin-header">
          <h1>Dashboard Overview</h1>
        </div>

        <div className="summary-cards">
          {statItems.map((stat, index) => (
            <div key={index} className="summary-card">
              <div className="summary-card-header">
                <span className="summary-card-title">{stat.label}</span>
                <div
                  className="summary-card-icon"
                  style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="summary-card-value">{stat.value}</div>
              <div className="summary-card-change">Last 24 hours</div>
            </div>
          ))}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn-primary"
                onClick={() => onNavigate('event-scheduler')}
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Calendar size={18} /> Schedule New Event
              </button>
              <button
                className="btn-primary"
                onClick={() => onNavigate('queue-management')}
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ClipboardList size={18} /> Manage Queues
              </button>
              <button
                className="btn-primary"
                onClick={() => onNavigate('counter-management')}
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Building2 size={18} /> Manage Counters
              </button>
              <button
                className="btn-primary"
                onClick={() => onNavigate('analytics')}
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <TrendingUp size={18} /> View Analytics
              </button>
              <button
                className="btn-primary"
                onClick={() => onNavigate('predictions')}
                style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Brain size={18} /> ML Predictions
              </button>
            </div>
          </div>

          {/* ML Predictions Preview */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={20} color="#8B5CF6" /> ML Predictions Preview
            </h3>
            {predictions.peakTimes && predictions.peakTimes.length > 0 ? (
              <>
                <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                  Next Peak Time: <strong>{predictions.peakTimes[0].hour}</strong> ({predictions.peakTimes[0].prediction})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {predictions.peakTimes.slice(0, 3).map((item, index) => (
                    <div key={index} style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--color-gray-50)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.hour}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                          {item.customers} customers predicted
                        </div>
                      </div>
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: item.prediction === 'High' ? '#FEE2E2' : item.prediction === 'Medium' ? 'var(--color-yellow-bg)' : 'var(--color-green-bg)',
                    color: item.prediction === 'High' ? '#991B1B' : item.prediction === 'Medium' ? 'var(--color-yellow)' : 'var(--color-green)'
                  }}>
                    {item.prediction}
                  </div>
                </div>
              ))}
            </div>
              </>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                No predictions available yet
              </div>
            )}
            <button
              className="btn-secondary"
              onClick={() => onNavigate('predictions')}
              style={{ width: '100%', marginTop: '1rem' }}
            >
              View All Predictions <ArrowRight size={16} />
            </button>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-gray-50)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>New event scheduled</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>General Health Checkup - 2 hours ago</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-gray-50)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Queue updated</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>5 customers joined queue - 3 hours ago</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-gray-50)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Counter activated</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>Counter 3 is now active - 4 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;



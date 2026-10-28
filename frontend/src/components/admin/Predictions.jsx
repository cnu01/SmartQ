import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import Sidebar from '../shared/Sidebar';
import '../../styles/admin.css';
import '../../styles/global.css';

const Predictions = ({ onNavigate, goBack, currentPage }) => {
  const [predictions, setPredictions] = useState({
    peakTimes: [],
    waitTimePredictions: [],
    crowdForecast: [],
    mlModelStats: {
      modelAccuracy: null,
      predictionsToday: null,
      avgAccuracy: null,
      lastUpdated: 'N/A'
    }
  });
  const [loading, setLoading] = useState(true);

  const formatLastUpdated = (value) => {
    if (!value || value === 'N/A') {
      return 'N/A';
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return parsedDate.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const getAuthConfig = () => ({
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const response = await axios.get(`${API_BASE_URL}/api/predictions`, getAuthConfig());
        const payload = response.data || {};
        setPredictions({
          peakTimes: payload.peakTimes || [],
          waitTimePredictions: payload.waitTimePredictions || [],
          crowdForecast: payload.crowdForecast || [],
          mlModelStats: {
            modelAccuracy: null,
            predictionsToday: null,
            avgAccuracy: null,
            lastUpdated: 'N/A',
            isSimulated: true,
            trained: Boolean(payload.trained),
            ...(payload.mlModelStats || {})
          }
        });
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setPredictions({
          peakTimes: [],
          waitTimePredictions: [],
          crowdForecast: [],
          mlModelStats: {
            modelAccuracy: null,
            predictionsToday: null,
            avgAccuracy: null,
            lastUpdated: 'N/A'
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  const getPredictionColor = (level) => {
    switch (String(level || '').toLowerCase()) {
      case 'high':
        return 'var(--color-red)';
      case 'medium':
        return 'var(--color-yellow)';
      case 'low':
        return 'var(--color-green-light)';
      default:
        return 'var(--color-gray-500)';
    }
  };

  const getPredictionBadge = (level) => {
    const color = getPredictionColor(level);
    return (
      <span className="badge" style={{ backgroundColor: `${color}20`, color: color, textTransform: 'capitalize' }}>
        {level}
      </span>
    );
  };

  const formatStatPercent = (value) =>
    Number.isFinite(value) ? `${value}%` : 'N/A';

  const statsSubtitle = predictions.mlModelStats?.trained
    ? 'From trained Random Forest models (R² on hold-out data)'
    : 'Estimated from current queue activity (train models for R² scores)';

  return (
    <div className="admin-layout">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} goBack={goBack} />
      <main className="admin-main">
        <div className="admin-header">
          <h1>ML-Powered Predictions</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
            {statsSubtitle}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div className="card">
            <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>Model Accuracy (wait time)</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-green-light)' }}>
              {formatStatPercent(predictions.mlModelStats.modelAccuracy)}
            </div>
            {!Number.isFinite(predictions.mlModelStats.modelAccuracy) && predictions.mlModelStats.trained && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', marginTop: '0.35rem' }}>
                Restart backend + run <code>npm run seed:demo</code> in backend/
              </div>
            )}
          </div>
          <div className="card">
            <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>Predictions Today</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {Number.isFinite(predictions.mlModelStats.predictionsToday) ? predictions.mlModelStats.predictionsToday : 'N/A'}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>Avg Accuracy (all models)</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8B5CF6' }}>
              {formatStatPercent(predictions.mlModelStats.avgAccuracy)}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>Last Updated</div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              lineHeight: 1.2,
              overflowWrap: 'anywhere'
            }}>
              {formatLastUpdated(predictions.mlModelStats.lastUpdated)}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div className="analytics-card">
            <h3 className="analytics-title">
              Peak Time Predictions (ML)
            </h3>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              Predicted using historical data and ML algorithms
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {predictions.peakTimes.length === 0 ? (
                <div style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>No peak-time forecasts yet.</div>
              ) : (
              predictions.peakTimes.map((item, index) => {
                const maxCustomers = predictions.peakTimes.length > 0 ? Math.max(...predictions.peakTimes.map(p => p.customers)) : 1;
                const width = (item.customers / maxCustomers) * 100;
                return (
                  <div key={index} style={{
                    padding: '1rem',
                    backgroundColor: 'var(--color-gray-50)',
                    borderRadius: '8px',
                    border: `2px solid ${getPredictionColor(item.prediction)}40`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{item.hour}</span>
                        <span style={{ marginLeft: '0.5rem' }}>{getPredictionBadge(item.prediction)}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{item.customers} customers</div>
                        {Number.isFinite(item.confidence) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{item.confidence}% confidence</div>
                        )}
                      </div>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--color-gray-200)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginTop: '0.5rem'
                    }}>
                      <div style={{
                        width: `${width}%`,
                        height: '100%',
                        background: `linear-gradient(to right, ${getPredictionColor(item.prediction)}, ${getPredictionColor(item.prediction)}80)`,
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>

          <div className="analytics-card">
            <h3 className="analytics-title">
              Wait Time Predictions (ML)
            </h3>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
              Forecast for the next 4 hours at current queue pressure
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {predictions.waitTimePredictions.length === 0 ? (
                <div style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>No wait-time forecasts yet.</div>
              ) : (
              predictions.waitTimePredictions.map((item, index) => (
                <div key={index} style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--color-gray-50)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-gray-200)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                        {item.time}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
                        Predicted: {item.predictedWait} min
                        {item.actualWait && ` | Actual: ${item.actualWait} min`}
                      </div>
                    </div>
                    {Number.isFinite(item.accuracy) && (
                      <div style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: item.accuracy >= 90 ? 'var(--color-green-bg)' : item.accuracy >= 80 ? 'var(--color-yellow-bg)' : 'var(--color-red-bg)',
                        borderRadius: '6px',
                        fontWeight: 600,
                        color: item.accuracy >= 90 ? 'var(--color-green)' : item.accuracy >= 80 ? 'var(--color-yellow)' : 'var(--color-red)'
                      }}>
                        {item.accuracy}%
                      </div>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        </div>

        <div className="analytics-card" style={{ marginBottom: '2rem' }}>
          <h3 className="analytics-title">
            Crowd Level Forecast (ML)
          </h3>
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>
            Next 6-hour crowd outlook from peak-time model
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {predictions.crowdForecast.length === 0 ? (
              <div style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>No crowd forecast available yet.</div>
            ) : (
            predictions.crowdForecast.map((item, index) => (
              <div key={index} className="card" style={{
                textAlign: 'center',
                padding: '1.5rem',
                border: `2px solid ${getPredictionColor(item.level)}40`
              }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '0.5rem' }}>
                  {item.date}
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  {item.time}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  {getPredictionBadge(item.level)}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-gray-500)',
                  marginTop: '0.5rem'
                }}>
                  {item.probability}% probability
                </div>
              </div>
            ))
            )}
          </div>
        </div>

        <div className="card" style={{
          backgroundColor: 'var(--color-primary-bg)',
          border: '1px solid var(--color-primary)',
          padding: '1.5rem'
        }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-gray-900)' }}>Machine Learning Model Information</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            <div>
              <strong>Algorithm:</strong> Random Forest Regression
            </div>
            <div>
              <strong>Training Data:</strong> 6 months historical data
            </div>
            <div>
              <strong>Features:</strong> Time, Day, Historical patterns, Weather
            </div>
            <div>
              <strong>Update Frequency:</strong> Real-time (every 5 minutes)
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Predictions;


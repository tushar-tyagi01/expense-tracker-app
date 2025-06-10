import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { axiosInstance } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryResponse, transactionsResponse] = await Promise.all([
        axiosInstance.get('/transactions/summary'),
        axiosInstance.get('/transactions')
      ]);
      
      setSummary({
        income: summaryResponse.data.income || 0,
        expense: summaryResponse.data.expense || 0,
        balance: summaryResponse.data.balance || 0,
        transactionCount: transactionsResponse.data.length || 0
      });
      setError('');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [axiosInstance]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const handleAddTransaction = () => {
    navigate('/transactions');
  };

  const handleViewReports = () => {
    navigate('/reports');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's your financial overview.</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Income</h3>
            <p className="stat-value">{formatCurrency(summary.income)}</p>
            <span className="stat-period">This month</span>
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-icon">
            <TrendingDown size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Expenses</h3>
            <p className="stat-value">{formatCurrency(summary.expense)}</p>
            <span className="stat-period">This month</span>
          </div>
        </div>

        <div className="stat-card balance">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Net Balance</h3>
            <p className={`stat-value ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
              {summary.balance >= 0 ? '+' : ''}{formatCurrency(summary.balance)}
            </p>
            <span className="stat-period">This month</span>
          </div>
        </div>

        <div className="stat-card transactions">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Transactions</h3>
            <p className="stat-value">{summary.transactionCount}</p>
            <span className="stat-period">This month</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="welcome-message">
          <h2>🎉 Welcome to your Expense Tracker!</h2>
          <p>Start by adding your first transaction or view detailed reports.</p>
          <div className="quick-actions">
            <button className="action-btn primary" onClick={handleAddTransaction}>
              Add Transaction
            </button>
            <button className="action-btn secondary" onClick={handleViewReports}>
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
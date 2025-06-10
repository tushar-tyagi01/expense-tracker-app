import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import './Reports.css';

const Reports = () => {
  const { axiosInstance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [transactionsResponse, summaryResponse] = await Promise.all([
        axiosInstance.get('/transactions'),
        axiosInstance.get(`/transactions/summary/${selectedYear}/${selectedMonth}`)
      ]);
      
      setTransactions(transactionsResponse.data);
      setSummary(summaryResponse.data);
      setError('');
    } catch (error) {
      console.error('Error fetching reports data:', error);
      setError('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  }, [axiosInstance, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const getCategoryData = (type) => {
    const filteredTransactions = transactions.filter(t => 
      t.type === type && 
      new Date(t.transactionDate).getMonth() + 1 === selectedMonth &&
      new Date(t.transactionDate).getFullYear() === selectedYear
    );
    
    const categoryTotals = {};
    filteredTransactions.forEach(transaction => {
      const category = transaction.categoryName;
      if (categoryTotals[category]) {
        categoryTotals[category] += Math.abs(transaction.amount);
      } else {
        categoryTotals[category] = Math.abs(transaction.amount);
      }
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  };

  const getMonthlyData = () => {
    const monthlyData = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, income: 0, expense: 0 };
      }
      
      if (transaction.type === 'INCOME') {
        monthlyData[monthKey].income += transaction.amount;
      } else {
        monthlyData[monthKey].expense += Math.abs(transaction.amount);
      }
    });

    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  };

  const expenseData = getCategoryData('EXPENSE');
  const incomeData = getCategoryData('INCOME');
  const monthlyData = getMonthlyData();

  if (loading) {
    return (
      <div className="reports-container">
        <div className="loading">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1>Reports & Analytics</h1>
        <div className="date-selector">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {Array.from({length: 5}, (_, i) => (
              <option key={2020 + i} value={2020 + i}>
                {2020 + i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="summary-cards">
        <div className="summary-card income">
          <h3>Monthly Income</h3>
          <p className="amount">{formatCurrency(summary.income || 0)}</p>
        </div>
        <div className="summary-card expense">
          <h3>Monthly Expenses</h3>
          <p className="amount">{formatCurrency(summary.expense || 0)}</p>
        </div>
        <div className="summary-card balance">
          <h3>Net Balance</h3>
          <p className={`amount ${(summary.balance || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(summary.balance || 0)}
          </p>
        </div>
      </div>

      {monthlyData.length > 0 && (
        <div className="chart-section">
          <h2>Monthly Trends (Last 6 Months)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#4ecdc4" strokeWidth={3} />
                <Line type="monotone" dataKey="expense" stroke="#ff6b6b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="charts-grid">
        {expenseData.length > 0 && (
          <div className="chart-section">
            <h2>Expense Categories</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {incomeData.length > 0 && (
          <div className="chart-section">
            <h2>Income Sources</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#4ecdc4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {transactions.length === 0 && (
        <div className="no-data">
          <h2>No Data Available</h2>
          <p>Start adding transactions to see detailed reports and analytics.</p>
        </div>
      )}
    </div>
  );
};

export default Reports; 
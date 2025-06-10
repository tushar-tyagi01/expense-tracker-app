import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Transactions.css';

const Transactions = () => {
  const { axiosInstance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    type: 'EXPENSE',
    categoryId: '',
    notes: ''
  });
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/transactions');
      setTransactions(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [axiosInstance]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to fetch categories');
    }
  }, [axiosInstance]);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [fetchTransactions, fetchCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.categoryId) {
      setError('Please select a category');
      return;
    }

    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId)
      };

      if (editingTransaction) {
        await axiosInstance.put(`/transactions/${editingTransaction.id}`, transactionData);
      } else {
        await axiosInstance.post('/transactions', transactionData);
      }

      await fetchTransactions();
      resetForm();
      setError('');
    } catch (error) {
      console.error('Error saving transaction:', error);
      setError(error.response?.data || 'Failed to save transaction');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await axiosInstance.delete(`/transactions/${id}`);
        await fetchTransactions();
        setError('');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setError('Failed to delete transaction');
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description,
      transactionDate: transaction.transactionDate,
      type: transaction.type,
      categoryId: transaction.categoryId.toString(),
      notes: transaction.notes || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      transactionDate: new Date().toISOString().split('T')[0],
      type: 'EXPENSE',
      categoryId: '',
      notes: ''
    });
    setEditingTransaction(null);
    setShowForm(false);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'ALL') return true;
    return transaction.type === filter;
  });

  const getCategoryOptions = () => {
    return categories.filter(category => {
      if (formData.type === 'EXPENSE') {
        return category.type === 'EXPENSE';
      } else {
        return category.type === 'INCOME';
      }
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="transactions-container">
      <div className="transactions-header">
        <h1 className="transactions-title">Transactions</h1>
        <button 
          className="add-transaction-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Transaction
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Transaction Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="transaction-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value, categoryId: ''})}
                    required
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    required
                  >
                    <option value="">Select a category</option>
                    {getCategoryOptions().map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({...formData, transactionDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Filters */}
      <div className="transaction-filters">
        <button 
          className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${filter === 'INCOME' ? 'active' : ''}`}
          onClick={() => setFilter('INCOME')}
        >
          Income
        </button>
        <button 
          className={`filter-btn ${filter === 'EXPENSE' ? 'active' : ''}`}
          onClick={() => setFilter('EXPENSE')}
        >
          Expenses
        </button>
      </div>

      {/* Transaction List */}
      <div className="transactions-list">
        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions found.</p>
            <button onClick={() => setShowForm(true)} className="add-first-btn">
              Add your first transaction
            </button>
          </div>
        ) : (
          filteredTransactions.map(transaction => (
            <div key={transaction.id} className="transaction-card">
              <div className="transaction-info">
                <div className="transaction-header">
                  <h3 className="transaction-description">{transaction.description}</h3>
                  <span className={`transaction-amount ${transaction.type.toLowerCase()}`}>
                    {transaction.type === 'INCOME' ? '+' : '-'}{formatAmount(Math.abs(transaction.amount))}
                  </span>
                </div>
                
                <div className="transaction-details">
                  <div className="transaction-category">
                    <span 
                      className="category-dot" 
                      style={{backgroundColor: transaction.categoryColor}}
                    ></span>
                    {transaction.categoryName}
                  </div>
                  <span className="transaction-date">{formatDate(transaction.transactionDate)}</span>
                </div>
                
                {transaction.notes && (
                  <div className="transaction-notes">{transaction.notes}</div>
                )}
              </div>
              
              <div className="transaction-actions">
                <button 
                  className="edit-btn"
                  onClick={() => handleEdit(transaction)}
                >
                  Edit
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDelete(transaction.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Transactions; 
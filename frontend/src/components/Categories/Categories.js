import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Categories.css';

const Categories = () => {
  const { axiosInstance } = useAuth();
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#667eea',
    type: 'EXPENSE'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const predefinedColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', 
    '#dda0dd', '#98d8c8', '#f7dc6f', '#667eea', '#764ba2',
    '#00b894', '#00cec9', '#ff7675', '#fd79a8', '#fdcb6e',
    '#e17055', '#81ecec', '#74b9ff', '#a29bfe', '#6c5ce7'
  ];

  const getErrorMessage = (error) => {
    if (error.response?.data) {
      // If it's a string, return it directly
      if (typeof error.response.data === 'string') {
        return error.response.data;
      }
      // If it's an object, try to extract the message
      if (error.response.data.message) {
        return error.response.data.message;
      }
      if (error.response.data.error) {
        return error.response.data.error;
      }
      // If it's a Spring Boot error response, extract the message
      if (error.response.data.timestamp) {
        return error.response.data.error || error.response.data.message || 'An error occurred';
      }
    }
    return error.message || 'An error occurred';
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/categories');
      setCategories(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [axiosInstance]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await axiosInstance.put(`/categories/${editingCategory.id}`, formData);
      } else {
        await axiosInstance.post('/categories', formData);
      }

      await fetchCategories();
      resetForm();
      setError('');
    } catch (error) {
      console.error('Error saving category:', error);
      setError(getErrorMessage(error));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await axiosInstance.delete(`/categories/${id}`);
        await fetchCategories();
        setError('');
      } catch (error) {
        console.error('Error deleting category:', error);
        setError(getErrorMessage(error));
      }
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      type: category.type
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#667eea',
      type: 'EXPENSE'
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const canModifyCategory = (category) => {
    return !category.isDefault;
  };

  const groupedCategories = {
    EXPENSE: categories.filter(cat => cat.type === 'EXPENSE'),
    INCOME: categories.filter(cat => cat.type === 'INCOME')
  };

  if (loading) {
    return (
      <div className="categories-container">
        <div className="loading">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="categories-container">
      <div className="categories-header">
        <h1 className="categories-title">Category Management</h1>
        <button 
          className="add-category-btn"
          onClick={() => setShowForm(true)}
        >
          + Add Category
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Category Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Category Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="e.g., Groceries, Entertainment"
                  />
                </div>
                
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of this category"
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-selector">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="color-input"
                  />
                  <div className="predefined-colors">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${formData.color === color ? 'selected' : ''}`}
                        style={{backgroundColor: color}}
                        onClick={() => setFormData({...formData, color})}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="categories-content">
        <div className="categories-section">
          <h2 className="section-title">
            <span className="expense-icon">💸</span>
            Expense Categories ({groupedCategories.EXPENSE.length})
          </h2>
          <div className="categories-grid">
            {groupedCategories.EXPENSE.map(category => (
              <div key={category.id} className="category-card">
                <div className="category-info">
                  <div className="category-header">
                    <span 
                      className="category-color" 
                      style={{backgroundColor: category.color}}
                    ></span>
                    <h3 className="category-name">{category.name}</h3>
                    <span className="category-badge">
                      {category.isDefault ? 'Default' : 'Custom'}
                    </span>
                  </div>
                  
                  {category.description && (
                    <p className="category-description">{category.description}</p>
                  )}
                </div>
                
                {canModifyCategory(category) && (
                  <div className="category-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(category.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="categories-section">
          <h2 className="section-title">
            <span className="income-icon">💰</span>
            Income Categories ({groupedCategories.INCOME.length})
          </h2>
          <div className="categories-grid">
            {groupedCategories.INCOME.map(category => (
              <div key={category.id} className="category-card">
                <div className="category-info">
                  <div className="category-header">
                    <span 
                      className="category-color" 
                      style={{backgroundColor: category.color}}
                    ></span>
                    <h3 className="category-name">{category.name}</h3>
                    <span className="category-badge">
                      {category.isDefault ? 'Default' : 'Custom'}
                    </span>
                  </div>
                  
                  {category.description && (
                    <p className="category-description">{category.description}</p>
                  )}
                </div>
                
                {canModifyCategory(category) && (
                  <div className="category-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(category)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(category.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories; 
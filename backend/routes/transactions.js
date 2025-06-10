const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { pool } = require('../config/database');

const router = express.Router();

// Validation rules
const transactionValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('description')
    .isLength({ min: 2, max: 255 })
    .withMessage('Description must be between 2 and 255 characters'),
  body('transactionDate')
    .isISO8601()
    .withMessage('Transaction date must be a valid date'),
  body('type')
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Transaction type must be either INCOME or EXPENSE'),
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a valid positive integer'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Helper function to format transaction response
const formatTransactionResponse = (transaction) => ({
  id: transaction.id,
  amount: parseFloat(transaction.amount),
  description: transaction.description,
  transactionDate: transaction.transaction_date,
  type: transaction.type,
  notes: transaction.notes,
  createdAt: transaction.created_at,
  updatedAt: transaction.updated_at,
  category: {
    id: transaction.category_id,
    name: transaction.category_name,
    type: transaction.category_type,
    color: transaction.category_color
  }
});

// Get transactions by date range (must be before /:id route)
router.get('/date-range', [
  query('startDate').isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').isISO8601().withMessage('End date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { startDate, endDate } = req.query;
    const connection = await pool.getConnection();
    
    try {
      const [transactions] = await connection.execute(`
        SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.transaction_date BETWEEN ? AND ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `, [req.user.id, startDate, endDate]);
      
      const formattedTransactions = transactions.map(formatTransactionResponse);
      res.json(formattedTransactions);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions by type (must be before /:id route)
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      const [transactions] = await connection.execute(`
        SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.type = ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `, [req.user.id, type]);
      
      const formattedTransactions = transactions.map(formatTransactionResponse);
      res.json(formattedTransactions);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly transactions (must be before /:id route)
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      const [transactions] = await connection.execute(`
        SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND YEAR(t.transaction_date) = ? AND MONTH(t.transaction_date) = ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `, [req.user.id, year, month]);
      
      const formattedTransactions = transactions.map(formatTransactionResponse);
      res.json(formattedTransactions);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current month summary (must be before /:id route)
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    const connection = await pool.getConnection();
    
    try {
      // Get income sum
      const [incomeResult] = await connection.execute(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE user_id = ? AND type = 'INCOME' 
        AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
      `, [req.user.id, year, month]);
      
      // Get expense sum
      const [expenseResult] = await connection.execute(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE user_id = ? AND type = 'EXPENSE' 
        AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
      `, [req.user.id, year, month]);
      
      const income = parseFloat(incomeResult[0].total);
      const expense = parseFloat(expenseResult[0].total);
      const balance = income - expense;
      
      res.json({
        income,
        expense,
        balance,
        year,
        month
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly summary for specific month (must be before /:id route)
router.get('/summary/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Get income sum
      const [incomeResult] = await connection.execute(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE user_id = ? AND type = 'INCOME' 
        AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
      `, [req.user.id, year, month]);
      
      // Get expense sum
      const [expenseResult] = await connection.execute(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions 
        WHERE user_id = ? AND type = 'EXPENSE' 
        AND YEAR(transaction_date) = ? AND MONTH(transaction_date) = ?
      `, [req.user.id, year, month]);
      
      const income = parseFloat(incomeResult[0].total);
      const expense = parseFloat(expenseResult[0].total);
      const balance = income - expense;
      
      res.json({
        income,
        expense,
        balance,
        year: parseInt(year),
        month: parseInt(month)
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all user transactions with optional pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
        ORDER BY t.transaction_date DESC, t.created_at DESC
      `;
      
      let params = [req.user.id];
      
      if (page && size) {
        const offset = (page - 1) * size;
        query += ' LIMIT ? OFFSET ?';
        params.push(size, offset);
      }
      
      const [transactions] = await connection.execute(query, params);
      
      const formattedTransactions = transactions.map(formatTransactionResponse);
      res.json(formattedTransactions);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create transaction
router.post('/', transactionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { amount, description, transactionDate, type, categoryId, notes } = req.body;
    const connection = await pool.getConnection();
    
    try {
      // Verify category exists and user has access to it
      const [categories] = await connection.execute(`
        SELECT * FROM categories 
        WHERE id = ? AND (user_id = ? OR is_default = TRUE)
      `, [categoryId, req.user.id]);
      
      if (categories.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      
      // Insert transaction
      const [result] = await connection.execute(`
        INSERT INTO transactions (amount, description, transaction_date, type, category_id, user_id, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [amount, description, transactionDate, type, categoryId, req.user.id, notes || null]);
      
      // Get the created transaction with category details
      const [transactions] = await connection.execute(`
        SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
      `, [result.insertId]);
      
      res.status(201).json(formatTransactionResponse(transactions[0]));
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single transaction (must be after specific routes)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    try {
      const [transactions] = await connection.execute(`
        SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.id = ? AND t.user_id = ?
      `, [id, req.user.id]);
      
      if (transactions.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      res.json(formatTransactionResponse(transactions[0]));
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction
router.put('/:id', transactionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { amount, description, transactionDate, type, categoryId, notes } = req.body;
    const connection = await pool.getConnection();
    
    try {
      // Check if transaction exists and belongs to user
      const [existingTransactions] = await connection.execute(
        'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
        [id, req.user.id]
      );
      
      if (existingTransactions.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      // Verify category exists and user has access to it
      const [categories] = await connection.execute(`
        SELECT * FROM categories 
        WHERE id = ? AND (user_id = ? OR is_default = TRUE)
      `, [categoryId, req.user.id]);
      
      if (categories.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      
      // Update transaction
      await connection.execute(`
        UPDATE transactions 
        SET amount = ?, description = ?, transaction_date = ?, type = ?, category_id = ?, notes = ?, updated_at = NOW()
        WHERE id = ? AND user_id = ?
      `, [amount, description, transactionDate, type, categoryId, notes || null, id, req.user.id]);
      
      // Get updated transaction with category details
      const [transactions] = await connection.execute(`
        SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.id = ?
      `, [id]);
      
      res.json(formatTransactionResponse(transactions[0]));
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'DELETE FROM transactions WHERE id = ? AND user_id = ?',
        [id, req.user.id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      
      res.json({ message: 'Transaction deleted successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 
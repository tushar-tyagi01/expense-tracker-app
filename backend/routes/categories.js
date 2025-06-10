const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');

const router = express.Router();

// Validation rules
const categoryValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Description cannot exceed 255 characters'),
  body('type')
    .isIn(['INCOME', 'EXPENSE'])
    .withMessage('Category type must be either INCOME or EXPENSE'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code')
];

// Get all categories for user (including default categories)
router.get('/', async (req, res) => {
  try {
    console.log('=== GET Categories Debug ===');
    console.log('User:', req.user);
    
    const connection = await pool.getConnection();
    
    try {
      const [categories] = await connection.execute(`
        SELECT * FROM categories 
        WHERE user_id = ? OR is_default = TRUE 
        ORDER BY name
      `, [req.user.id]);
      
      console.log(`Found ${categories.length} categories`);
      res.json(categories);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.log('Error in getUserCategories:', error.message);
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get categories by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid category type' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      const [categories] = await connection.execute(`
        SELECT * FROM categories 
        WHERE (user_id = ? OR is_default = TRUE) AND type = ?
        ORDER BY name
      `, [req.user.id, type]);
      
      res.json(categories);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/', categoryValidation, async (req, res) => {
  try {
    console.log('=== POST Categories Debug ===');
    console.log('User:', req.user);
    console.log('Request:', req.body.name, req.body.type);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, description, color, type } = req.body;
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(`
        INSERT INTO categories (name, description, color, type, user_id, is_default, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, FALSE, NOW(), NOW())
      `, [name, description || null, color || '#FF6B6B', type, req.user.id]);
      
      // Get the created category
      const [categories] = await connection.execute(
        'SELECT * FROM categories WHERE id = ?',
        [result.insertId]
      );
      
      console.log('Category saved successfully:', result.insertId);
      res.status(201).json(categories[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.log('Error in createCategory:', error.message);
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update category
router.put('/:id', categoryValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const { name, description, color, type } = req.body;
    const connection = await pool.getConnection();
    
    try {
      // Check if category exists and belongs to user
      const [categories] = await connection.execute(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );
      
      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      const category = categories[0];
      
      // Only allow users to update their own categories, not default ones
      if (category.is_default || category.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Cannot modify this category' });
      }
      
      // Update category
      await connection.execute(`
        UPDATE categories 
        SET name = ?, description = ?, color = ?, type = ?, updated_at = NOW()
        WHERE id = ?
      `, [name, description || null, color || category.color, type, id]);
      
      // Get updated category
      const [updatedCategories] = await connection.execute(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );
      
      res.json(updatedCategories[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    try {
      // Check if category exists and belongs to user
      const [categories] = await connection.execute(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );
      
      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      const category = categories[0];
      
      // Only allow users to delete their own categories, not default ones
      if (category.is_default || category.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Cannot delete this category' });
      }
      
      // Check if category is being used in transactions
      const [transactions] = await connection.execute(
        'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
        [id]
      );
      
      if (transactions[0].count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete category that is being used in transactions' 
        });
      }
      
      // Delete category
      await connection.execute('DELETE FROM categories WHERE id = ?', [id]);
      
      res.json({ message: 'Category deleted successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 
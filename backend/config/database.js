const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'expense_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        type ENUM('INCOME', 'EXPENSE') NOT NULL,
        color VARCHAR(7) DEFAULT '#FF6B6B',
        user_id BIGINT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create transactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        amount DECIMAL(10,2) NOT NULL,
        description VARCHAR(255) NOT NULL,
        transaction_date DATE NOT NULL,
        type ENUM('INCOME', 'EXPENSE') NOT NULL,
        category_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        notes VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Insert default categories if they don't exist
    const [existingCategories] = await connection.execute(
      'SELECT COUNT(*) as count FROM categories WHERE is_default = TRUE'
    );

    if (existingCategories[0].count === 0) {
      const defaultCategories = [
        // Income categories
        { name: 'Salary', description: 'Monthly salary', type: 'INCOME', color: '#4CAF50' },
        { name: 'Freelance', description: 'Freelance work income', type: 'INCOME', color: '#8BC34A' },
        { name: 'Investment', description: 'Investment returns', type: 'INCOME', color: '#CDDC39' },
        { name: 'Other Income', description: 'Other sources of income', type: 'INCOME', color: '#FFC107' },
        
        // Expense categories
        { name: 'Food & Dining', description: 'Food and restaurant expenses', type: 'EXPENSE', color: '#FF5722' },
        { name: 'Transportation', description: 'Transport and fuel expenses', type: 'EXPENSE', color: '#FF9800' },
        { name: 'Shopping', description: 'Shopping and retail expenses', type: 'EXPENSE', color: '#E91E63' },
        { name: 'Entertainment', description: 'Entertainment and leisure', type: 'EXPENSE', color: '#9C27B0' },
        { name: 'Bills & Utilities', description: 'Monthly bills and utilities', type: 'EXPENSE', color: '#3F51B5' },
        { name: 'Healthcare', description: 'Medical and healthcare expenses', type: 'EXPENSE', color: '#2196F3' },
        { name: 'Education', description: 'Education and learning expenses', type: 'EXPENSE', color: '#00BCD4' },
        { name: 'Other Expenses', description: 'Other miscellaneous expenses', type: 'EXPENSE', color: '#607D8B' }
      ];

      for (const category of defaultCategories) {
        await connection.execute(
          'INSERT INTO categories (name, description, type, color, user_id, is_default) VALUES (?, ?, ?, ?, NULL, TRUE)',
          [category.name, category.description, category.type, category.color]
        );
      }
      console.log('Default categories created successfully');
    }

    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase
}; 
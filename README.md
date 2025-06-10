# Expense Tracker App

A simple expense tracking application for managing personal finances.

## What it does

This app helps you track your expenses and income. You can add transactions, see your balance, and view reports.

## Features

- Login and signup
- Add income and expenses
- Different categories for transactions
- View monthly reports
- Dashboard with balance

## Technology used

**Frontend:**
- React
- HTML/CSS
- JavaScript

**Backend:**
- Node.js with Express
- MySQL database

## How to run

### Backend
1. Make sure you have Node.js installed
2. Install MySQL and create a database called `expense_tracker`
3. Go to backend-nodejs folder
4. Run: `npm install`
5. Copy .env file and update database credentials if needed
6. Run: `npm run dev`

### Frontend
1. Make sure you have Node.js installed
2. Go to frontend folder
3. Run: `npm install`
4. Run: `npm start`

The app will open at http://localhost:3000

## How to use

1. Register a new account
2. Login with your credentials
3. Add your income and expenses
4. Check the dashboard for your balance
5. View reports to see spending patterns

## Database

The app uses MySQL with these tables:
- users
- transactions  
- categories
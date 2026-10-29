# Personal Expense Tracker

A full-stack web application to manage personal income, expenses, monthly budgets, and financial reports.

## Features
- Add and delete income and expense transactions
- Track total income, expenses, and balance
- Set and monitor monthly budgets
- View expense reports and charts
- Filter transactions
- Export reports as PDF
- Form validation
- MongoDB data persistence

## Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- REST API

### Database
- MongoDB Atlas
- Mongoose

### Tools
- Git
- GitHub
- npm

## Getting Started

### Prerequisites
- Node.js
- npm
- MongoDB Atlas

### Clone the repository
```bash
git clone https://github.com/soudhasoudha03/expense-tracker.git
cd expense-tracker
```

### Backend Setup
```bash
cd backend
npm install
```

Create a `backend/.env` file and add your MongoDB connection string:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

Start the backend:

```bash
node server.js
```

### Frontend Setup

Open a new terminal:

```bash
cd expense-tracker/frontend
npm install
npm run dev
```

Open the local URL provided by Vite.

## Author

**Soudha V M**

MERN & Python Full Stack Developer

GitHub: https://github.com/soudhasoudha03

Project: https://github.com/soudhasoudha03/expense-tracker

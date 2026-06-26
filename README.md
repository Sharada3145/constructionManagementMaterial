# Construction Material Inventory & Consumption Management System

A full‑stack web application for construction companies to manage material stock, handle contractor requests, and generate real‑time analytics and reports.

## Features
- Role‑based authentication (Admin, Stock Manager, Contractor)
- Material inventory with low‑stock alerts and history
- AI‑enhanced fuzzy search & natural‑language request parsing
- Request approval workflow and automatic stock updates
- Interactive dashboards with Chart.js visualisations
- PDF/Excel report generation
- Purchase entry, notifications, audit logs, and more

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, React Router, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **AI**: Simple fuzzy‑matching algorithm (Levenshtein) for material name correction

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://localhost:27017` or via a cloud URI)

### 1. Backend Setup & Run
Open a terminal and navigate to the backend folder:
```bash
cd backend
npm install
```

**(Optional but recommended)** Populate the database with sample data (users, suppliers, materials):
```bash
npm run seed
```

Start the backend server (runs on port 5000):
```bash
npm run dev
```

### 2. Frontend Setup & Run
Open a **new** terminal window and navigate to the frontend folder:
```bash
cd frontend
npm install
```

Start the Vite development server (runs on port 3000):
```bash
npm run dev
```

### 3. Access the Application
Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

**Test Accounts** (If you ran the seed script):
- **Admin**: `admin@construction.com` / `admin123`
- **Stock Manager**: `manager@construction.com` / `manager123`
- **Contractor**: `rajesh@construction.com` / `contractor123`
mongodb+srv://<db_username>:<db_password>@cluster0.l5otk4r.mongodb.net/?appName=Cluster0
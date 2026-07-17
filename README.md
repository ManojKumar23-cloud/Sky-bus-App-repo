# SkyBus - Intercity Bus Booking Platform

A production-grade single-brand intercity bus booking application built with FastAPI + React.

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, SQLite (dev) / Azure SQL (prod)
- **Frontend**: React 18, Vite, TailwindCSS, Zustand
- **Auth**: JWT-based authentication
- **Payment**: Razorpay (test mode)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or yarn

### Setup (One Command)

**Linux/Mac:**
```bash
chmod +x setup.sh && ./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python seed_data.py
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:5173/admin

### Default Admin Credentials
- Email: admin@skybus.in
- Password: admin123

## Features

1. **Search & Discovery** - Search buses by route, date, filters
2. **Seat Selection** - Interactive visual seat maps
3. **Booking Flow** - Complete passenger details + payment
4. **Payment** - Razorpay test mode integration
5. **User Management** - JWT auth, profiles, booking history
6. **Live Tracking** - Simulated GPS tracking
7. **Admin Panel** - Full management dashboard
8. **Reviews & Ratings** - Post-trip feedback
9. **Offers & Coupons** - Discount system
10. **Notifications** - Email confirmations

## API Documentation

Visit http://localhost:8000/docs for interactive Swagger documentation.

## Project Structure

```
skybus/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
├── docker-compose.yml
└── README.md
```

## License

Proprietary - SkyBus Technologies Pvt. Ltd.

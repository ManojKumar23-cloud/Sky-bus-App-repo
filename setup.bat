@echo off
echo ====================================
echo  SkyBus - Setup Script (Windows)
echo ====================================
echo.

:: Backend setup
echo [1/4] Setting up Backend...
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt -q
copy .env.example .env 2>nul
echo Backend dependencies installed.
echo.

:: Seed database
echo [2/4] Seeding database...
python seed_data.py
echo.

:: Frontend setup
echo [3/4] Setting up Frontend...
cd ..\frontend
call npm install --silent
copy .env.example .env 2>nul
echo Frontend dependencies installed.
echo.

cd ..

echo ====================================
echo  Setup Complete!
echo ====================================
echo.
echo To start the application:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     venv\Scripts\activate
echo     uvicorn app.main:app --reload --port 8000
echo.
echo   Terminal 2 (Frontend):
echo     cd frontend
echo     npm run dev
echo.
echo   Access:
echo     Frontend: http://localhost:5173
echo     API Docs: http://localhost:8000/docs
echo.
echo   Credentials:
echo     Admin: admin@skybus.in / admin123
echo     User: test@example.com / test123
echo ====================================
pause

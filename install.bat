@echo off
echo.
echo  BoardEase — Install Dependencies
echo  ==================================
echo.

echo [1/2] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 ( echo Backend install failed & pause & exit /b 1 )

echo.
echo [+] Creating uploads folder...
if not exist "uploads" mkdir uploads

cd ..

echo.
echo [2/2] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 ( echo Frontend install failed & pause & exit /b 1 )
cd ..

echo.
echo  Done! To run the project:
echo.
echo   Step 1:  start.bat          (starts Docker infra)
echo   Step 2:  cd backend  ^&^& npm run dev
echo   Step 3:  cd frontend ^&^& npm run dev
echo.
pause

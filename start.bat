@echo off
echo.
echo  BoardEase — Start Infrastructure (Docker)
echo  ==========================================
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
  echo  ERROR: Docker is not installed or not in PATH.
  echo  Download: https://www.docker.com/products/docker-desktop
  pause
  exit /b 1
)

echo  Starting Kafka, RabbitMQ, and Redis...
docker compose up -d

if %errorlevel% neq 0 (
  echo  ERROR: Docker Compose failed. Check output above.
  pause
  exit /b 1
)

echo.
echo  Infrastructure is running!
echo.
echo   Kafka     ^>  localhost:9092
echo   RabbitMQ  ^>  localhost:5672  (UI: http://localhost:15672  guest/guest)
echo   Redis     ^>  localhost:6379
echo.
echo  Now open TWO more terminals and run:
echo.
echo   Terminal 1:  cd backend  ^&^& npm run dev
echo   Terminal 2:  cd frontend ^&^& npm run dev
echo.
echo  Then open:  http://localhost:3000
echo.
echo  To stop Docker:  docker compose down
echo.
pause

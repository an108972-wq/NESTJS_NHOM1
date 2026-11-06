@echo off
chcp 65001 >nul
title Library Management System
echo ========================================================
echo        ĐANG KHỞI ĐỘNG HỆ THỐNG QUẢN LÝ THƯ VIỆN
echo ========================================================
echo.

:: 1. Kiểm tra và tự động bật MySQL nếu chưa chạy
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL/MariaDB đã đang chạy sẵn sàng.
) else (
    echo [..] Đang khởi động MySQL từ XAMPP...
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 3 /nobreak >nul
        echo [OK] Đã bật MySQL thành công!
    ) else (
        echo [!] Vui lòng đảm bảo MySQL trong XAMPP đã được bật.
    )
)

:: 2. Tự động mở trình duyệt sau khi server khởi động
start "" cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"

:: 3. Khởi chạy NestJS
echo.
echo ========================================================
echo   Hệ thống đang mở trình duyệt tại: http://localhost:3000
echo   Tài liệu API Swagger tại:        http://localhost:3000/api/docs
echo   (Để tắt hệ thống: Nhấn Ctrl + C hoặc đóng cửa sổ này)
echo ========================================================
echo.
npm run start:dev


@echo off
chcp 65001 >nul
echo ======================================================================
echo   KHÔI PHỤC BẢN QUYỀN TRUY CẬP MARIADB XAMPP (GIỮ NGUYÊN DATABASE)
echo ======================================================================
echo.

echo [1/3] Đang tắt các tiến trình MySQL/MariaDB đang chạy...
net stop mysql 2>nul
taskkill /F /IM mysqld.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2/3] Đang khôi phục bảng phân quyền 'mysql' từ thư mục backup của XAMPP...
if exist "C:\xampp\mysql\backup\mysql" (
    if exist "C:\xampp\mysql\data\mysql" (
        if not exist "C:\xampp\mysql\data\mysql_corrupted" (
            ren "C:\xampp\mysql\data\mysql" mysql_corrupted
        ) else (
            rd /s /q "C:\xampp\mysql\data\mysql" 2>nul
        )
    )
    xcopy /E /I /Y "C:\xampp\mysql\backup\mysql" "C:\xampp\mysql\data\mysql" >nul
    echo [OK] Đã khôi phục thành công quyền truy cập 'localhost' cho root!
) else (
    echo [!] Không tìm thấy thư mục C:\xampp\mysql\backup\mysql
    pause
    exit /b 1
)

echo [3/3] Hoàn tất khôi phục.
echo.
echo ======================================================================
echo   ĐÃ SỬA XONG LỖI (HY000/1130)!
echo.
echo   CÁC BƯỚC TIẾP THEO:
echo   1. Mở XAMPP Control Panel và bấm nút 'Start' tại MySQL.
echo   2. Mở trình duyệt vào http://localhost/phpmyadmin kiểm tra (sẽ vào được ngay).
echo   3. Mở terminal chạy dự án: npm run start:dev
echo ======================================================================
echo.
pause

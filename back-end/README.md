Cần cài đặt thư viện FastAPI và paho-mqtt

pip install fastapi uvicorn paho-mqtt

Để chạy file **d:\python\Scripts\main.py** cần cấu hình files **setup.bat** như sau:
<pre>
@echo off
set SERVICE_NAME=A1_fastAPI
set NSSM_PATH=D:\python\Scripts\nssm.exe
set PYTHON_PATH=D:\python\python.exe
set APP_DIR=D:\python\Scripts
set ARGS=-m uvicorn main:app --host "0.0.0.0" --port 8003

echo Installing %SERVICE_NAME% ...
%NSSM_PATH% install %SERVICE_NAME% "%PYTHON_PATH%" %ARGS%

echo Setting AppDirectory to %APP_DIR% ...
%NSSM_PATH% set %SERVICE_NAME% AppDirectory %APP_DIR%

echo Starting service %SERVICE_NAME% ...
%NSSM_PATH% start %SERVICE_NAME%

echo Done.
pause
</pre>

Chú ý: thư mục **d:\python\Scripts\** đang chứa các files: fastapi.exe, uvicorn.exe, nssm.exe, main.py, setup.bat
chạy file **setup.bat** để cài đặt service

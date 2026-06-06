@echo off
title GST Summary Creator Launcher
echo ===================================================
echo             GST Summary Creator Launcher
echo ===================================================
echo.
echo Starting Flask application server...
echo opening default web browser at http://127.0.0.1:5000/
echo.

:: Start the browser async
start "" "http://127.0.0.1:5000"

:: Start the Flask app
python app.py

pause

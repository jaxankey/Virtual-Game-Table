@echo off
set /p game="game: " || set "game=0"
set /p port="port: " || set "port=0"

title %game%:%port%

node server.js %game% %port%

@pause

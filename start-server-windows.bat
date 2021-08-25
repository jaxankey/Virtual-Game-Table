@echo off
set /p game="game: " || set "game=puerto-rico"
set /p port="port: " || set "port=38000"

title %game%:%port%

node server.js %game% %port%

@pause

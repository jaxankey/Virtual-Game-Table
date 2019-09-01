@echo off
set /p game="game: "
set /p port="port: "

title %game%:%port%

node server.js %game% %port%
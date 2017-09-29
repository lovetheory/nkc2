export NODE_ENV=development
set NODE_ENV=development
:loop
@echo Starting...
@node.exe -i server.js
@goto :loop

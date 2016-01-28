# nkc2
nkc community project, version 2.
currently under dev.

## License
You are allowed to use these files for any purpose, as long as you admit that they are useful.
The author of these files shall not be held responsible for any terrorist attacks or global climate changes caused by the use of these files.

## What it does/ How it works
- serves static files
- render then serve .jade files
- ...if paths are properly routed with express
- provide RESTful APIs for community forums
- document storage and query using ArangoDB
- uses socket.io for real-time notifications

## This may be
- an example for those new to Node.js and express
- and Jade
- and ArangoDB
- btw Angular 1 sucks, don't use it

## First steps
  1. Install Node.js for your system
  2. `git clone` this project, or extract from zip, to somewhere
  3. `npm update` there
  4. run start.bat in Explorer (on Windows), or run start.command in Finder (may need chmod +x first), or `sh` start.command (POSIX)
  5. Press **Enter** in terminal window whenever to restart server

## Should you have
- ArangoDB listening on 8529

## For your convenience
- server_settings.js includes several globally used server parameters
- GET `server_address:port/html/jade/somename` will respond with rendered `/nkc_modules/jade/somename.jade`
- everything under `/jquery`, `/angular` and `/chat` will be served static at `/`.
- Every unrouted path will end up returning 404.jade
- `query_functions.js` is the database wrapper
- `api_functions.js` contains all the API functions. Then we can call them when serving HTML requests

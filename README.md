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


## To Get Started
  1. Install Node.js for your system and make sure `npm` is available as a command.
  2. `git clone` this project, or extract from zip, to somewhere nice
  3. `npm update` there for the dependencies.
  4. Make sure ArangoDB is listening on __localhost:8529__, then run __db_restore.command__ from Finder (OS X: may need `chmod +x` first) or `sh db_restore.command` (UNIX) to load the database.
  5. run __start.bat__ from Explorer (on Windows), or run __start.command__ from Finder (OS X: may need `chmod +x` first) or `sh` __start.command__ (UNIX) to start the server in a CLI environment.
  6. Press **Enter** in terminal window whenever to restart server. You may also visit `server:port/reload` to do the same.


## For your convenience
- by default listens on __localhost:1086__
- `server_settings.js` includes several globally used server parameters and static serving routes
- GET `server:port/html/jade/somename` will respond with rendered `/nkc_modules/jade/somename.jade`
- Every unrouted path will end up returning 404.jade
- `markdown`, `bbcode` and `plain` is available as filters when rendering .jade files using `require('jaderender')(filename,options)`.
- `query_functions.js` is the database wrapper
- `api_functions.js` contains all the API functions. They are called before serving API/HTML requests
- `whatever_handlers.js` contains route endpoints, in the form of __Express__ middlewares.

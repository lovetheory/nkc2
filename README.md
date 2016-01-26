# nkc2
nkc community project, version 2.
currently under dev.

# What it does
- serve static files
- render then serve .jade files
- ...if paths are properly routed with express
- RESTful apis forming a forum
- based on ArangoDB
- socket.io for real-time notifications

# First steps
  1. Install Node.js for your system
  2. `git clone` this project, or extract from zip, to somewhere
  3. `npm update` there
  4. run start.bat in Explorer (on Windows), or run start.command in Finder (on OS X, may need chmod +x), or `sh` start.command (POSIX)
  5. Press **Enter** in terminal window whenever to restart server

# Should you have
- ArangoDB listening on 8529

# Explanation
- server_settings.js includes several globally used server parameters
- GET `server_address:port/html/jade/:jadeFileName` will return rendered `jadeFineName.jade`
- everything under /jquery /angular /chat will be served static.
- Every unrouted path will end up returning 404.jade

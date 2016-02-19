global.__projectroot = __dirname + '/';//create global variable for project root directory
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment');
var fs = require('fs');
var net = require('net');

var settings = require('server_settings');
var permissions = require('permissions');
var helper_mod = require('helper')();

var jaderender = require('jaderender');

var compression = require('compression');
var express = require('express');
var rewrite = require('express-urlrewrite');
var request = require('request');

var nkc = express(); //main router

//----------------------
//server definitions
var use_https = settings.server.use_https;
var target_server, redirection_server, tcp_router;

if(use_https){
  var https_options = settings.https_options(); //load the pem files

  target_server =
  require('https').Server(https_options,nkc);

  redirection_server =
  require('http').createServer(function(req, res) {
    var host = req.headers['host'];
    res.writeHead(301, { "Location": "https://" + host + req.url });
    res.end();
  });

  tcp_router = net.createServer(tcpConnection);

  function tcpConnection(conn)
  {
    conn.once('data', function (buf) {
      // A TLS handshake record starts with byte 22.
      var address = (buf[0] === 22) ? 53001 : 53000;
      var proxy = net.createConnection(address, function () {
        proxy.write(buf);
        conn.pipe(proxy).pipe(conn);
      });
    });
  }
}else {
  target_server = require('http').Server(nkc);
}
//-------------------------------

nkc.use(compression({level:2}));//enable compression

//log me
nkc.use((req,res,next)=>{
  requestLog(req);
  next();
});

//url rewrite
for(i in settings.urlrewrite){
  nkc.use(rewrite(
    settings.urlrewrite[i].map,
    settings.urlrewrite[i].to
  ));
}

//api serving
var api_handlers = require('api_handlers.js');
nkc.use('/api',api_handlers.route_handler);

//html serving
var html_handlers = require('html_handlers');
nkc.use('/html',html_handlers.route_handler);

var interface_handlers = require('interface_handlers');
nkc.use('/interface',interface_handlers.route_handler);

//chatroom serving
var chat_handlers = require('chat_handlers.js');
nkc.use('/chat',chat_handlers.route_handler);//routing

//chatroom socket
var io = require('socket.io')(target_server);
//this function must be called after the definition of target_server object.

var chat_io = io.of('/chat');// socket.io namespacing
chat_handlers.socket_handler(chat_io);//pass namespaced socket object into processing function

//root serving
nkc.get('/',(req,res)=>{
  var opt = settings.jadeoptions;
  opt.address = req.ip.toString();
  opt.osinfo = JSON.stringify(osinfo(),null,2);
  res.send(
    jaderender('nkc_modules/jade/index.jade',opt)
  );
});

nkc.get('/api',(req,res)=>{
  var opt = {};
  opt.address = req.ip.toString();
  opt.osinfo = JSON.stringify(osinfo(),null,2);
  res.send(
    jaderender('nkc_modules/jade/index.jade',opt)
  );
});

nkc.get('/reload',function(req,res){
  res.send(`<h1>Reload Page to Stop Server</h1>`);
  process.exit();
});

//static file serves
for(i in settings.root_serve_static)
{
  if(settings.root_serve_static[i].map){
    nkc.use(settings.root_serve_static[i].map,express.static(settings.root_serve_static[i].to));
  } else {
    nkc.use(express.static(settings.root_serve_static[i].to));
  }
}

//unrouted url handler
//404 handling
nkc.get('*',(req,res)=>{
  var opt = {};
  opt.url = req.originalUrl;
  res.status(404).send(
    jaderender('nkc_modules/jade/404.jade',opt)
  );
});

//unhandled error handler
//aka 500 handling
nkc.use((err,req,res,next)=>{
  report('not handled',err.stack);
  var opt = {};
  opt.url = req.originalUrl;
  opt.errormessage = err.message;
  opt.errorstack = err.stack;
  res.status(500).send(
    jaderender('nkc_modules/jade/500.jade',opt)
  );
});

//server listening settings
if(use_https){
  ///-----start https server-----
  target_server.listen(53001);
  //-----start http redirection server-----
  redirection_server.listen(53000);
  //-----start tcp router
  tcp_router.listen(settings.server.port);
}
else{
  //if not using https
  target_server.listen(settings.server.port);
}

var listening_addr = (use_https?tcp_router:target_server).address().address;
var listening_port = (use_https?tcp_router:target_server).address().port;
dash();
report(settings.server.name+' listening on '+listening_addr+' '+listening_port);

//end process after pressing ENTER, for debugging purpose
process.openStdin().addListener('data',function(d){
  if(d.toString().trim()=='')
  process.exit();
});

//console.log(permissions.getpermissions(['god','default']));

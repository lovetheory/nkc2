global.__projectroot = __dirname + '/';//create global variable for project root directory
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

global.environment = process.env.NODE_ENV?process.env.NODE_ENV:'development';
global.development = environment !== 'production';
console.log('running in '+environment+' mode');

var settings = require('server_settings');

var moment = require('moment');
var fs = require('fs');
var net = require('net');

var permissions = require('permissions');
var helper_mod = require('helper')();

var jaderender = require('jaderender');

var compression = require('compression');
var express = require('express');
var rewrite = require('express-urlrewrite');
var request = require('request');

var cookieparser = require('cookie-parser');

var apifunc = require('api_functions');
var queryfunc = require('query_functions');
queryfunc.db_init();

var nkc = express(); //main router

nkc.set('json spaces',2);
nkc.enable('trust proxy');

//----------------------
//server definitions
var use_https = settings.server.use_https;
//var target_server, redirection_server, tcp_router;

if(use_https){
  var https_options = settings.https_options(); //load the pem files

  var target_server =
  require('https').Server(https_options,nkc);

  var redirection_server =
  require('http').createServer(function(req, res) {
    var host = req.headers['host'];
    res.writeHead(301, { "Location": "https://" + host + req.url });
    res.end();
  });

}else {
  var target_server = require('http').Server(nkc);
}
//-------------------------------

nkc.use((req,res,next)=>{
  if(development)
  console.log("  -".yellow,req.url);
  //log everything
  next();
});

//1. url rewrite
for(i in settings.urlrewrite){
  nkc.use(rewrite(
    settings.urlrewrite[i].map,
    settings.urlrewrite[i].to
  ));
}

//2. static file serves
for(i in settings.root_serve_static)
{
  if(settings.root_serve_static[i].map){
    nkc.use(
      settings.root_serve_static[i].map,
      express.static(settings.root_serve_static[i].to,settings.static_settings)
    );
  } else {
    nkc.use(
      express.static(settings.root_serve_static[i].to,settings.static_settings)
    );
  }
}

//ikc statics serving
nkc.use('/recruit',express.static('../ikc')); //serve company pages

//3. gzip
nkc.use(compression({level:settings.compression_level}));//enable compression

//4. log request, if not static resources
nkc.use((req,res,next)=>{
  if(req.url.indexOf('/avatar/')>=0&&req.method=='GET')return next();
  //dont record avatar requests

  var d=new Date();
  dash();
  console.log(dateString(d).cyan,
  req.ip, req.method, req.originalUrl.cyan);

  //reformat ipaddr, kill portnames suffix
  req.ip = req.ip.replace(/.*(:[0-9]{1,})/,'');
  next();
});

//5. parse cookie
nkc.use(cookieparser(settings.cookie_secret));

//6. obtain userinfo from cookies
nkc.use((req,res,next)=>{
  var userinfo = req.signedCookies.userinfo;
  if(userinfo){//if not undefined
    req.userinfo = JSON.parse(userinfo);//usually stored in JSON
  }
  next();
});

//7. obtain user (from DB)
nkc.use((req,res,next)=>{
  if(!req.userinfo)return next();//if userinfo (from cookie) not exist
  if(req.url.indexOf('/avatar')>=0 && req.method != 'POST')return next();
  //if going for avatar

  //if userinfo exists
  console.log(JSON.stringify(req.userinfo).gray);

  apifunc.get_user(req.userinfo.uid,(err,back)=>{
    if(err)return next(); //let go
    if(back.username==req.userinfo.username)
    {
      req.user = back;
    }
    else
    {
      //dont do a thing.
    }

    return next();
  });
});

//8. routes

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
  var data={};
  data.user = req.user;
  data.userinfo = req.userinfo; //from cookies
  data.address = req.ip.toString();
  data.osinfo = JSON.stringify(osinfo(),null,2);
  res.send(
    jaderender('nkc_modules/jade/index.jade',data)
  );
});

nkc.get('/reload',function(req,res){
  res.send(`<h1>Reload Page to Stop Server</h1>`);
  process.exit();
});

//7. error handling
//unrouted url handler
//404 handling
nkc.get('*',(req,res)=>{
  var data = {};
  data.url = req.originalUrl;
  res.status(404).send(
    jaderender('nkc_modules/jade/404.jade',data)
  );
});

//unhandled error handler
//aka 500 handling
nkc.use((err,req,res,next)=>{
  report('not handled',err.stack);
  var data = {};
  data.url = req.originalUrl;
  data.err = err.stack?err.stack:JSON.stringify(err);
  res.status(500).send(
    jaderender('nkc_modules/jade/500.jade',data)
  );
});

//server listening settings
if(use_https){
  ///-----start https server-----
  target_server.listen(settings.server.https_port);
  //-----start http redirection server-----
  redirection_server.listen(settings.server.port);
}
else{
  //if not using https
  target_server.listen(settings.server.port);
}

var listening_addr = target_server.address().address;
var listening_port = target_server.address().port;
dash();
report(settings.server.name+' listening on '+listening_addr+' '+listening_port);

//end process after pressing ENTER, for debugging purpose
process.openStdin().addListener('data',function(d){
  if(d.toString().trim()=='')
  process.exit();
});

//console.log(permissions.getpermissions(['god','default']));

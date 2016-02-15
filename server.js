module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings');
var permissions = require('permissions');
var helper_mod = require('helper')();
var validation = require('validation');

var jaderender = require('jaderender');

var compression = require('compression');
var express = require('express');
var jade = require('jade');
var nkc = express(); //main router
var http = require('http').Server(nkc);

var db = require('arangojs')(settings.arango.address);
db.useDatabase('testdb');
var collection = db.collection('testdata');

var request = require('request');

nkc.use(compression({level:2}));//enable compression

//log me
nkc.use((req,res,next)=>{
  requestLog(req);
  next();
});

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
var io = require('socket.io')(http);
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
  var opt = settings.jadeoptions;
  opt.address = req.ip.toString();
  opt.osinfo = JSON.stringify(osinfo(),null,2);
  res.send(
    jade.renderFile('nkc_modules/jade/index.jade',opt)
  );
});

nkc.get('/reload',function(req,res){
  res.send(`<h1>Reload Page to Stop Server</h1>`);
  process.exit();
});

//statics
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
  var opt = settings.jadeoptions;
  opt.url = req.originalUrl;
  res.status(404).send(
    jade.renderFile('nkc_modules/jade/404.jade',opt)
  );
});

//unhandled error handler
//aka 500 handling
nkc.use((err,req,res,next)=>{
  report('not handled',err.stack);
  var opt = settings.jadeoptions;
  opt.url = req.originalUrl;
  opt.errormessage = err.message;
  opt.errorstack = err.stack;
  res.status(500).send(
    jade.renderFile('nkc_modules/jade/500.jade',opt)
  );
});

///------------------------------------------
///-----start server-----
var server = http.listen(settings.server.port,settings.server.address,
  () =>
  {
    var host = server.address().address;
    var port = server.address().port;
    dash();
    report(settings.server.name+' listening on '+host.toString()+' '+port.toString());
  }
);

//end process after pressing ENTER, for debugging purpose
process.openStdin().addListener('data',function(d){
  if(d.toString().trim()=='')
  process.exit();
});

//console.log(permissions.getpermissions(['god','default']));

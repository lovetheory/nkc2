module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var validation = require('validation.js');

var express = require('express');
var jade = require('jade');
var nkc = express(); //main router
var http = require('http').Server(nkc);

//CouchDB
var nano = require('nano')
('http://'+settings.couchdb.address+':'+settings.couchdb.port.toString());

var posts = nano.use("posts");
var chat = nano.use("chat");
var users = nano.use('users');
var counters = nano.use('counters');

var db = require('arangojs')(settings.arango.address);
db.useDatabase('testdb');
var collection = db.collection('testdata');

var request = require('request');

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

//chatroom serving
var chat_handlers = require('chat_handlers.js')
nkc.use('/chat',chat_handlers.route_handler);//routing

//chatroom socket
var io = require('socket.io')(http);
var chat_io = io.of('/chat');// socket.io namespacing
chat_handlers.socket_handler(chat_io);//pass namespaced socket object into processing function

//clientside js file serving
nkc.use(express.static('nkc_modules/chat'));
nkc.use(express.static('nkc_modules/jquery'));
nkc.use(express.static('nkc_modules/angular'));

//root serving
nkc.get('/',(req,res)=>{
  var opt = settings.jadeoptions;
  opt.address = req.ip.toString();
  opt.osinfo = JSON.stringify(osinfo(),null,2);
  res.send(
    jade.renderFile('nkc_modules/jade/index.jade',opt)
  );
});

//404 catching
nkc.get('*',(req,res)=>{
  var opt = settings.jadeoptions;
  opt.url = req.originalUrl;
  res.send(
    jade.renderFile('nkc_modules/jade/404.jade',opt)
  );
});

//unhandled error handler
nkc.use((err,req,res,next)=>{
  report('not handled',err.stack);
  res.json({error:err.message});
});

///------------------------------------------
///start server
var server = http.listen(settings.server.port,settings.server.address,
  function(){
    var host = server.address().address;
    var port = server.address().port;
    dash();
    report(settings.server.name+' listening on '+host.toString()+' '+port.toString());
  }
);

//end process after pressing ENTER, for debug purpose
var stdin = process.openStdin();
stdin.addListener("data",function(d){
  if(d.toString().trim()=="")
  process.exit();
});

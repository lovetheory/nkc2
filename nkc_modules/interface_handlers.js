//interface handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var fs=require('fs');
var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var jaderender = require('jaderender');

var express = require('express');
var iface = express.Router();

var apifunc = require('api_functions');

///------------
///to be executed before all handlers below
iface.use(function(req,res,next){
  next();
});


//render forumview
iface.get('/forum/:fid',function(req,res,next){
  apifunc.get_threads_from_forum_as_forum({
    fid:req.params.fid,
    start:req.query.start,
    count:req.query.count,
  },(err,data)=>{
    if(err){next(err);return;}
    //if nothing went wrong
    var opt = {};
    opt.data = data;
    opt.replytarget = 'forum/' + req.params.fid;
    try{
      var k = jaderender('nkc_modules/jade/interface_forum.jade',opt);
    }catch(err){next(err);return;}
    res.send(k);
  });
});

//render threadview
///----------------------------------------
iface.get('/thread/:tid', function (req, res, next){
  apifunc.get_posts_from_thread_as_thread({
    tid:req.params.tid,
    start:req.query.start,
    count:req.query.count,
  },
  (err,data)=>{
    if(err){
      next(err);
      return;
    }
    //if nothing went wrong
    var opt = {};
    opt.data = data;
    opt.replytarget = 'thread/' + req.params.tid;
    try{
      var k = jaderender('nkc_modules/jade/interface_thread.jade',opt);
    }
    catch(err){next(err);return;}
    res.send(k);
  });
});

//get editor
///--------------------
iface.get('/editor',(req,res,next)=>{
  var opt = {};

  var e = {
    target:req.query.target,
  };

  opt.editor=e;

  res.send(jaderender('nkc_modules/jade/interface_editor.jade',opt));
});

//unhandled error will be routed back to server.js

exports.route_handler = iface;

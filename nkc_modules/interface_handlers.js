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

//render threadview
///----------------------------------------
iface.get('/thread/:tid', function (req, res, next){
  apifunc.get_post_from_thread({
    tid:req.params.tid,
    start:req.query.start,
    count:req.query.count,
  },
  (err,body)=>{
    if(err){
      next(err);
      return;
    }
    //if nothing went wrong
    var opt = {};
    opt.posts = body;
    opt.replytarget = 'thread/' + req.params.tid;
    opt.dateString = dateString;

    res.send(jaderender('nkc_modules/jade/interface_thread.jade',opt));
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

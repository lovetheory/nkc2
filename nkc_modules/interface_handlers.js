//interface handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var fs=require('fs');
var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var request = require('request');
var jade = require('jade');
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
    if(!err)
    {//if nothing went wrong
      var opt = settings.jadeoptions;
      opt.posts = body;

      try{
        res.send(jade.renderFile('nkc_modules/jade/interface_thread.jade',opt));
      }
      catch(err){
        next(err);
        return;
      }
    }
    else {//if error happened
      next();
    }
  });
});

//get editor
///--------------------
iface.get('/editor',(req,res,next)=>{
  var opt = settings.jadeoptions;

  try{
    res.send(jade.renderFile('nkc_modules/jade/interface_editor.jade',opt));
  }
  catch(err){
    next(err);
    return;
  }
});

iface.get('*.js',express.static('nkc_modules/jade'));

//unhandled error will be routed back to server.js

exports.route_handler = iface;

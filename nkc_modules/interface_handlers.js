//interface handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var fs=require('fs');
var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var request = require('request');
var jade = require('jade');

var commonmark = require('commonmark');
var plain_escape = require('jade/plain_escaper');
var xbbcode = require('xbbcode/xbbcode');

function bbcodeconvert(input){
  return xbbcode.process({
    text:input,
  }).html;
}

var commonreader = new commonmark.Parser();
var commonwriter = new commonmark.HtmlRenderer();
var commonparser = (input)=>{return commonwriter.render(commonreader.parse(input));} // result is a String

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
    var opt = settings.jadeoptions;
    opt.posts = body;
    opt.replytarget = 'thread/' + req.params.tid;
    opt.dateString = dateString;
    opt.markdown = commonparser;
    opt.plain = plain_escape;
    opt.bbcode = bbcodeconvert;

    res.send(jade.renderFile('nkc_modules/jade/interface_thread.jade',opt));
  });
});

//get editor
///--------------------
iface.get('/editor',(req,res,next)=>{
  var opt = settings.jadeoptions;

  var e = {
    target:req.query.target,
  };

  opt.editor=e;

  res.send(jade.renderFile('nkc_modules/jade/interface_editor.jade',opt));
});

//unhandled error will be routed back to server.js

exports.route_handler = iface;

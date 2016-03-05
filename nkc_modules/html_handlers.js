//api request handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var fs=require('fs');
var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var jaderender = require('jaderender');

var request = require('request');
var jade = require('jade');
var express = require('express');
var handler = express.Router();

///------------
///to be executed before all handlers below
handler.use(function(req,res,next){
  next();
});

///------------
///to be executed before all handlers below
handler.use(function(req,res,next){
  if(!res.data)
  res.data = {}
  next();
});

handler.use(function(req,res,next){
  //every page has a navbar, allright?
  res.data.navbar = {};
  //so, would you log in first please?
  res.data.user = req.user;
  res.data.userinfo = req.userinfo;
  next();
});

handler.use('/jade/',express.static('nkc_modules/jade')); //file serving

//var hellojade = jade.compileFile('./nkc_modules/jade/hello.jade',jadeoptions)

handler.get('/jade/:fn',(req,res,next)=>{
  fs.access('nkc_modules/jade/'+req.params.fn+'.jade', fs.R_OK , function (err) {
    if(err)
    //pass next
    return next(err);

    res.template= 'nkc_modules/jade/'+req.params.fn+'.jade';
    next();
  });
});

//render phase: if template jade file exists
handler.use((req,res,next)=>{
  if(res.template)
  {
    try {var k = jaderender(res.template,res.data)}
    catch(err){
      return next(err);
    }
    return res.send(k);
    //ends here, no more hassle
  }
  return next();
});

//unhandled error will be routed back to server.js

exports.route_handler = handler;

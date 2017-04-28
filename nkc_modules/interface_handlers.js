//interface handlers


var fs=require('fs');
var moment = require('moment');

var settings = require('./server_settings.js');
var helper_mod = require('./helper.js')();

var jaderender = require('./jaderender');

var express = require('express');
var iface = express.Router();

var apifunc = require('./api_functions');
var async = require('async');

///------------
///to be executed before all handlers below
iface.use(function(req,res,next){
  if(!res.data)
  res.data = {};
  res.data.site = settings.site;
  res.data.query = req.query;
  res.data.params = req.params;
  next();
});

iface.use(function(req,res,next){
  //every page has a navbar, allright?
  res.data.navbar = {};
  //so, would you log in first please?
  res.data.user = req.user;
  res.data.userinfo = req.userinfo;
  next();
});


iface.get('/uploader',(req,res,next)=>{
  if(!req.user)throw ('require login');
  res.data.navbar.highlight = 'uploader'; //navbar highlight

  res.template = 'nkc_modules/jade/interface_attachment_uploader.jade';

  next();
});



//render phase: if template jade file exists
iface.use((req,res,next)=>{
  if(res.template)
  {
    var k = jaderender(res.template,res.data)
    return res.send(k);
    //ends here, no more hassle
  }
  return next();
});

//unhandled error will be routed back to server.js
exports.route_handler = iface;

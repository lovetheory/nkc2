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

//get editor
///--------------------
iface.get('/editor',(req,res,next)=>{
  var target = req.query.target||"";
  res.data.replytarget = target;
  res.data.navbar.highlight = 'editor'; //navbar highlight
  res.template = 'nkc_modules/jade/interface_editor.jade'

  if(target.indexOf('post/')==0)
  {
    //if user appears trying to edit a post
    var pid = target.slice(5);
    report(pid);
    //load from db
    apifunc.get_a_post(pid)
    .then(function(back){
      res.data.original_post = back;
    })
    .then(next).catch(next)

    return;
  }
  next();
});

iface.get('/me',(req,res,next)=>{
  if(!req.user)throw ('require login');
  res.template = 'nkc_modules/jade/interface_user_profile.jade';
  res.replytarget = 'me';
  next();
});

iface.get('/uploader',(req,res,next)=>{
  if(!req.user)throw ('require login');
  res.data.navbar.highlight = 'uploader'; //navbar highlight

  res.template = 'nkc_modules/jade/interface_attachment_uploader.jade';

  next();
});

iface.get('/questions',(req,res,next)=>{
  if(req.user){
    apifunc.get_questions(null)
    .then(function(back){
      res.data.questions_all = back;
      return apifunc.get_questions(req.user._key)
    })
    .then(function(back){
      res.data.questions = back;
      res.template = 'nkc_modules/jade/questions_edit.jade';
    })
    .then(next).catch(next)

  }else{
    res.template = 'nkc_modules/jade/questions_edit.jade';
    next();
  }
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

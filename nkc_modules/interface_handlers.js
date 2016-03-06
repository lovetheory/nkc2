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
  if(!res.data)
  res.data = {}
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

//render forumview
iface.get('/forum/:fid',function(req,res,next){
  apifunc.get_threads_from_forum_as_forum({
    fid:req.params.fid,
    start:req.query.start,
    count:req.query.count,
  },(err,data)=>{
    if(err)return next(err);
    //if nothing went wrong

    Object.assign(res.data,data);
    res.data.replytarget = 'forum/' + req.params.fid;
    res.template = 'nkc_modules/jade/interface_forum.jade';
    return next();
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
      return next(err);
    }
    //if nothing went wrong

    res.data.replytarget = 'thread/' + req.params.tid;
    Object.assign(res.data,data);
    res.template = 'nkc_modules/jade/interface_thread.jade'
    return next();
  });
});

//get editor
///--------------------
iface.get('/editor',(req,res,next)=>{
  res.data.replytarget = req.query.target;
  res.data.navbar.highlight = 'editor'; //navbar highlight
  res.template = 'nkc_modules/jade/interface_editor.jade'
  return next();
});

//get login
iface.get('/login',(req,res,next)=>{
  res.template = 'nkc_modules/jade/interface_user_login.jade';
  next();
});

//get register form
iface.get('/register',(req,res,next)=>{
  res.template = 'nkc_modules/jade/interface_user_register.jade';
  next();
});

iface.get('/logout',(req,res,next)=>{
  res.template = 'nkc_modules/jade/interface_user_logout.jade';

  //put a signed cookie in header
  res.cookie('userinfo',{info:'nkc_logged_out'},{
    signed:true,
    expires:(new Date(Date.now()-86400000)), //expire the cookie!
    encode:String,
  });

  res.data.userinfo = null; //nullify the userinfo
  res.data.user = null;

  next();
});

iface.get('/me',(req,res,next)=>{
  if(!req.user)return next('require login');
  res.template = 'nkc_modules/jade/interface_user_profile.jade';
  res.replytarget = 'me';
  next();
});

iface.get('/uploader',(req,res,next)=>{
  if(!req.user)return next('require login');
  res.template = 'nkc_modules/jade/interface_attachment_uploader.jade';

  next();
});

//render phase: if template jade file exists
iface.use((req,res,next)=>{
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
exports.route_handler = iface;

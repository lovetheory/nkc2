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

iface.use(function(req,res,next){
  if(req.url.indexOf('/forum/')==0||
  req.url.indexOf('/thread/')==0||
  req.url.indexOf('/home')==0||
  true)
  {
    //if requesting for above paths
    //apply forum list info
    apifunc.get_all_forums()
    .then(function(back){
      res.data.forums = back;
    })
    .then(next)
    .catch(next)
  }else {
    next();
  }
});


//render threadview
///----------------------------------------
iface.get('/thread/:tid', function (req, res, next){
  apifunc.get_posts_from_thread_as_thread({
    tid:req.params.tid,
    start:req.query.start,
    count:req.query.count,
  })
  .then((data)=>{
    //if nothing went wrong

    res.data.replytarget = 'thread/' + req.params.tid;
    Object.assign(res.data,data);
    res.template = 'nkc_modules/jade/interface_thread.jade'

  })
  .then(next)
  .catch(next)

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

//get login
iface.get('/login',(req,res,next)=>{
  res.template = 'nkc_modules/jade/interface_user_login.jade';
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

iface.get('/experimental',function(req,res,next){
  res.template = 'nkc_modules/jade/interface_experimental.jade'
  next()
})

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

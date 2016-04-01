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
  req.url.indexOf('/home')==0)
  {
    //if requesting for above two paths
    //apply forum list info
    apifunc.get_all_forums(function(err,back){
      if(err)next(err);
      res.data.forums = back;
      next();
    });
  }else {
    next();
  }
});

//render front page
iface.get('/home',function(req,res,next)
{
  async.each(res.data.forums,
    function(forum,cb){
      apifunc.get_threads_from_forum_as_forum({
        fid:forum._key,
        start:0,
        count:6,
        no_forum_inclusion:true, //do not include again..
      },function(err,data){
        if(err)return cb(err);
        forum.threads = data.threads;
        cb();
      })
    }
    ,function(err){
      if(err)return next(err);

      res.template='nkc_modules/jade/interface_home.jade';
      return next();
    }
  )
})

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
  res.data.replytarget = req.query.target||'';
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
  res.data.navbar.highlight = 'uploader'; //navbar highlight

  res.template = 'nkc_modules/jade/interface_attachment_uploader.jade';

  next();
});

iface.get('/questions',(req,res,next)=>{
  if(req.user){
    apifunc.get_questions(null,function(err,back){
      if(err)return next(err);
      res.data.questions_all = back;
      apifunc.get_questions(req.user._key,function(err,back){
        if(err)return next(err);
        res.data.questions = back;
        res.template = 'nkc_modules/jade/questions_edit.jade';
        next();
      })
    })
  }else{
    res.template = 'nkc_modules/jade/questions_edit.jade';
    next();
  }
});

iface.get('/exam',function(req,res,next){
  if(req.user)return next('logout first, yo')

  res.template = 'nkc_modules/jade/interface_exam.jade';

  if(req.query.result){
    res.data.result = req.query.result

    return next();
  }

  apifunc.exam_gen({ip:req.ip},function(err,back){
    if(err)return next(err);

    res.data.exam = back;
    next();
  })
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

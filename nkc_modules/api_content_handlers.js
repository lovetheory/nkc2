//api content request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var async = require('async');

var express = require('express');
var api = express.Router();

var validation = require('validation');
var apifunc = require('api_functions');
var queryfunc = require('query_functions');

///------------
///something here to be executed before all handlers below
api.use(function(req,res,next){
  next();
});

//----
//counter increment api
if(development){
  api.get('/new/:countername',(req,res,next)=>{
    //queryfunc.incr_counter('threads',callback);
    queryfunc.incr_counter(req.params.countername,(err,id)=>{
      if(err)return next(report(req.params.countername +' retrieval error',err));
      res.obj = id;
      next();
    });
  });
}

//append userinfo into request body of POSTs
//and necessary processing
api.use(function preprocess_post(req,res,next){
  if(req.method != 'POST')return next();//if not post request
  if(!req.body.c)return next();//if body doesnt contain written content for posting, ignore
  //require a user!!
  if(!req.user)return next('contain content, but not logged in');

  var r = validation.validatePost(req.body); //validate content
  if(r!==true)//if failed to validate
  {
    return next(r);
  }

  req.body.uid = req.user._key;
  req.body.username = req.user.username;

  req.post_content_ready = true; //indicate req.body suits for posting
  return next();
});


//POST /forum/:fid
api.post('/forum/:fid',(req,res,next)=>{
  if(req.post_content_ready!==true)return next('content unready');
  req.body.t = req.body.t.trim();
  if(req.body.t.length<3)return next('title too short. write something would you?')

  apifunc.post_to_forum(req.body,req.params.fid.toString(),(err,result)=>{
    if(err)return next(err);

    var k =result;
    k.redirect = 'thread/'+ queryfunc.result_reform(k).id;
    console.log('ss');
    res.obj = k;
    return next();
  });
});

///POST /thread/* handler
api.post('/thread/:tid',function(req,res,next){
  if(req.post_content_ready!==true)return next('content unready');

  apifunc.post_to_thread(req.body,req.params.tid,(err,result)=>{
    if(err)return next(err);

    result.redirect = 'thread/' + queryfunc.result_reform(result).id;
    res.obj = result;
    return next();
  },
  false);
});

api.post('/post/:pid',function(req,res,next){
  if(req.post_content_ready!==true)return next('content unready');

  apifunc.edit_post(req.body,req.params.pid,(err,result)=>{
    if(err)return next(err);

    result.redirect = 'thread/'+result.tid + '?post='+ result._key;
    res.obj = result;
    next();
  });
})

//test handler.
api.get('/test2',(req,res)=>{
  apifunc.post_to_thread({c:'fuckyou again yo bitch'},'29',(err,result)=>{
    if(err){
      res.status(500).json(report('error in test2',err));
    }else{
      res.json(report(result));
    }
  });
});

///----------------------------------------
///GET /posts/* handler
api.get('/post/:pid', function (req, res, next){
  //retrieve pid as parameter
  var pid=req.params.pid;

  //get the post from db
  apifunc.get_a_post(pid,(err,body)=>{
    if(err)return next(err);
    //if nothing wrong
    report(pid.toString()+' is hit');
    //var result=postRepack(body);
    res.obj = body;
    return next();
  });
});

///----------------------------------------
///GET /thread/* handler
api.get('/thread/:tid', function (req, res, next){
  apifunc.get_posts_from_thread_as_thread({
    tid:req.params.tid,
    start:req.query.start,
    count:req.query.count,
  },
  (err,result)=>{
    if(err){next(err);return;}
    res.obj = result;next();
  });
});

//GET /forum/*
api.get('/forum/:fid',(req,res,next)=>{
  apifunc.get_threads_from_forum_as_forum({
    fid:req.params.fid,
    start:req.query.start,
    count:req.query.count,
  },
  (err,data)=>{
    if(err)return next(err);
    res.obj = data;
    next();
  });
});

module.exports = api;

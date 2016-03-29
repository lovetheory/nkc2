//api questions request handlers
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


api.post('/questions',function(req,res,next){
  if(!req.user)return next('require login');
  if(!req.body)return next('bodyless');

  var question = req.body;

  if(!question.question||!question.answer||!question.type)return next('fuck you');

  question.username = req.user.username;
  question.uid = req.user._key;
  question.toc = Date.now();

  apifunc.post_questions(question,function(err,back){
    if(err)return next(err);
    res.obj = back;
    next();
  });
});

api.get('/questions',function(req,res,next){
  if(!req.user)return next('require login');

  var param = req.user._key;
  if(req.query['all'])param=null;

  apifunc.get_questions(param,function(err,back){
    if(err)return next(err);
    res.obj = back;
    next();
  })
});

api.delete('/questions/:qid',function(req,res,next){
  if(!req.user)return next('login pls');

  queryfunc.doc_load(req.params.qid,'questions',function(err,back){
    if(err)return next(err);
    if(back.uid!==req.user._key)//if not owning the question
    return next('not owning');

    queryfunc.doc_kill(req.params.qid,'questions',function(err,back){
      if(err)return next(err);
      res.obj=back;
      next();
    })
  });
});


module.exports = api;

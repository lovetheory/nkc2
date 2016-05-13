//api request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyparser = require('body-parser');

var jaderender = require('jaderender');

var express = require('express');
var api = express.Router();

///something here to be executed before all handlers below
api.use(function(req,res,next){
  next();
});

//api_resouces_handlers
api.use(require('api_resources_handlers'));

//parse body. expect JSON;
api.use(bodyparser.json());

api.use(function(req,res,next){
  //if(!req.body&&req.method=='POST')throw ('bodyless POST request');
  next();
});

//api_content_handler
api.use(require('api_content_handlers'))

//
api.use(require('api_question_handlers'))

//login handlers
api.use(require('api_login_handlers'));

//new API
api.use(require('api_experimental_handlers'));

//send apidata back to client
api.use((req,res,next)=>{
  var obj = res.obj
  if(obj)
  {
    if(!obj.template){
      return res.json(report(obj));
      //return without continue
    }
    else{
      //if template specified
      var k = jaderender(obj.template,obj)
      return res.send(k);
    }
  }

  return next();
});

//404 endpoint
api.use('*',(req,res)=>{
  res.status(404).json(
    report('endpoint not exist','endpoint not exist')
  );
});

//unhandled error handler
api.use((err,req,res,next)=>{
  if(req.file)
  {
    //delete uploaded file when error happens
    fs.unlink(req.file.filename,(err)=>{
      if(err)report('error unlinking file, but dont even care',err);
    });
  }

  if(res.obj){
    if(res.obj.template){
      throw err
    }
  }
  res.status(500).json(report('error within /api',err));
});

exports.route_handler = api;

//api request handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');

var nano = require('nano')('http://'+settings.couchdb.address+':'+settings.couchdb.port.toString());
var posts = nano.use("posts");
var chat = nano.use("chat");
var users = nano.use("users");
var counters = nano.use('counters');
var request = require('request');

var db = require('arangojs')(settings.arango.address);
db.useDatabase('testdb');
var testdata = db.collection('testdata');

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

//parse body. expect json
api.use(bodyParser.json());

//expect urlencoded
//api.use(bodyParser.urlencoded({extended:false}));//false = plaintext urlencoded parsing

///test arango api
api.get('/angularfun',function(req,res){
  testdata.document('angularfun').then(
    doc=>{
      res.json(doc);
    },
    err=>{
      res.json(report('err',err));
    }
  );
});

api.post('/angularfun',function(req,res){
  if(!req.body.table)
  {
    res.json(report('paramerr','bad'));
    return;
  }
  var doc ={
    //_key:'angularfun',
    table:req.body.table,
  };
  testdata.update('angularfun',doc).then(
    meta => {
      res.json(report(meta));
    },
    err => {
      console.error('Failed to save document:', err)
      res.json(report('dbfailure',err));
    }
  );
});

//----
//counter increment api
api.get('/new/:countername',(req,res)=>{
  //queryfunc.incr_counter('threads',callback);
  queryfunc.incr_counter(req.params.countername,(err,id)=>{
    if(err){
      res.json(report(req.params.countername +' retrieval error',err));
    }else{
      res.json(report(id));
    }
  });
});

//test handler.
api.get('/test',(req,res)=>{
  apifunc.post_to_forum({content:'fuckyou'},'default',(err,result)=>{
    if(err){
      res.json(report('error in test',err));
    }else{
      res.json(report(result));
    }
  });
});

//test handler.
api.get('/test2',(req,res)=>{
  apifunc.post_to_thread({content:'fuckyou again yo bitch'},29,(err,result)=>{
    if(err){
      res.json(report('error in test2',err));
    }else{
      res.json(report(result));
    }
  });
});

///----------------------------------------
///GET /posts/* handler
api.get('/posts/:pid', function (req, res){
  //retrieve pid as parameter
  var pid=req.params.pid;

  //get the post from db
  apifunc.get_a_post(pid,(err,body)=>{
    if(!err)
    {//if nothing wrong
      report(pid.toString()+' is hit');
      //var result=postRepack(body);
      res.json(report(body));
    }
    else
    {//if error happened
      res.json(report('pid not found within /posts/',err));
    }
  });
});

///----------------------------------------
///GET /thread/* handler
api.get('/thread/:tid', function (req, res){
  apifunc.get_post_from_thread({
    tid:req.params.tid,
    start:req.query.start,
    count:req.query.count,
  },
  (err,body)=>{
    if(!err)
    {//if nothing went wrong
      res.json(body);
    }
    else {//if error happened
      res.json(report('cant get /thread/:tid',err));
    }
  });
});

///POST /thread/* handler
api.post('/thread/:tid',function(req,res){
  apifunc.post_to_thread(req.body,req.params.tid,(err,result)=>{
    if(err){
      res.json(report('error in test2',err));
    }else{
      res.json(report(result));
    }
  },
  false);
});

//GET /forum/*
api.get('/forum/:fid',(req,res)=>{
  apifunc.get_thread_from_forum({
    fid:req.params.fid,
    start:req.query.start,
    count:req.query.count,
  },
  (err,body)=>{
    if(!err)
    {
      res.json(body);
    }
    else{
      res.json(report('cant get /forum/:fid',err));
    }
  });
});

//unhandled error handler
api.use((err,req,res,next)=>{
  report('error within /api',err.stack);
  res.status(500).json({error:err.message});
});

exports.route_handler = api;

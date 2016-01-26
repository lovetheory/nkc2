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

///------------
///logger, to be executed before all handlers below
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

///----------------------------------------
///GET /posts/* handler
api.get('/posts/:pid', function (req, res){
  //retrieve pid as parameter
  var pid=req.params.pid;

  //get the post from db
  posts.get(pid,{},function(err,body){
    if(!err)
    {//if nothing wrong
      report(pid.toString()+' is hit');
      var result=postRepack(body);
      res.json(report(result));
    }
    else
    {//if error happened
      res.json(report('pid not found within /posts/',err));
    }
  });
});

///------------------------------------------
/// POST /posts handler
api.post('/posts',function(req,res)
{
  requestLog(req);//log
  report('request body received');
  report(req.body);

  /*
  var requestObject={};
  try {
  requestObject = JSON.parse(req.body);
}
catch(err){
res.json(report('error parsing json',err));//if body is not JSON, exit
return;
}
*/

report('json successfully parsed');

//check if object is legal (contains enough fields)
if(validation.validatePost(req.body)){
  //if okay, don't do a thing
}else{
  res.json(report('bad field/illegal input',req.body));
  return;
}

//obtain a pid by atomically incrementing the postcount document
counters.atomic("counters",'counters','postcount',{},function(err,body)
{
  if(!err)
  {
    report('postcount given:'+body.toString());

    //construct new post document
    var newpost={};
    newpost._id=body.toString();
    newpost.content=req.body.content;
    newpost.toc=Date.now();

    //insert the document into db
    posts.insert(newpost,function(err,body)
    {
      if(!err)//if succeed
      {
        report('insert succeed');
        res.json(report({status:"succeed",id:newpost._id}));
      }
      else
      {
        res.json(report('error inserting',err));
      }
    });
  }
  else
  {//if unable to obtain
    res.json(report("failed to obtain atomically incrementing postcount",err));
  }
});
});

///----------------------------------------
///GET /thread/* handler
api.get('/thread/:tid', function (req, res) {
  requestLog(req);

  var tid=req.params.tid;//thread id

  if(tid=='12647'){res.send('dont try again pls');return;}

  posts.view('thread','thread',{startkey:[parseInt(tid),0],endkey:[parseInt(tid),11111111111]},
  function(err,body){
    if(!err)
    {//if nothing went wrong
      for(var i = 0, size = body.rows.length; i < size ; i++){
        var item = body.rows[i];
        body.rows[i]=postRepack(item.value);
      }
      res.json({'tid':tid,'posts':body.rows});
    }
    else {//if error happened
      console.log(tid,'is notfound within /thread/*, or other error');
      console.log(err);
      res.json({error:"notfound"});
    }
  });
});

//unhandled error handler
api.use((err,req,res,next)=>{
  report('error within /api',err.stack);
  res.status(500).json({error:err.message});
});

exports.route_handler = api;

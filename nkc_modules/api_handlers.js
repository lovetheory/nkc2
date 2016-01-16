//api request handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var nano = require('nano')('http://'+settings.couchdb.address+':'+settings.couchdb.port.toString());
var posts = nano.use("posts");
var chat = nano.use("chat");
var users = nano.use("users");
var counters = nano.use('counters');
var request = require('request');

var express = require('express');
var api = express.Router();

///------------
///logger, to be executed before all handlers below
api.use(function(req,res,next){
  requestLog(req);
  next();
});


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

  //receive post body
  var requestBody=[];
  req.on('error', function(err){
    report('error receiving body',err)
  }).on('data', function(chunk) {
    requestBody.push(chunk);
  }).on('end', function() {
    requestBody = Buffer.concat(requestBody).toString();
    //body fully received
    report('request body received');
    report(requestBody);

    var requestObject={};
    try {
      requestObject = JSON.parse(requestBody);
    }
    catch(err){
      res.json(report('error parsing json',err));//if body is not JSON, exit
      return;
    }
    report('json successfully parsed');

    //check if object is legal (contains enough fields)
    if(validatePost(requestObject)){
      //if okay, don't do a thing
    }else{
      res.json(report('bad field/illegal input',requestObject));
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
        newpost.content=requestObject.content;
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

exports.route_handler = api;

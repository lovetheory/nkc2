//api request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var path = require('path')
var fs = require('fs')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');
var multer = require('multer'); //multi-part parser, for upload

var async = require('async');

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

//multi-part parsing.
var upload = multer({ dest: 'tmp/' });
api.post('/resources', upload.single('file'), function (req, res) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  console.log(req.file);
  /*
  { fieldname: 'file',
  originalname: '1.jpeg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  destination: 'tmp/',
  filename: '785b0943d7c454067762f3d1328aa739',
  path: 'tmp/785b0943d7c454067762f3d1328aa739',
  size: 17343 }
  */

  //obtain an rid first
  apifunc.get_new_rid((err,rid)=>{
    if(err){
      res.status(500).json(report('rid obtain err',err));
      return;
    }
    //rid got
    var robject = {
      _key:rid,
      oname:req.file.originalname,//原名
      sname:req.file.filename,//存储名
      size:req.file.size,
      mime:req.file.mimetype,
    };

    //storage into db
    queryfunc.doc_save(robject,'resources',function(err,result){
      if(err){
        res.status(500).json(report('rid saving err',err));
        return;
      }

      //success
      result.rid = result['_key'];
      res.json(report(result));
    });
  });
});

api.get('/resources/:rid',function(req,res){
  var key = req.params.rid;
  //load from db
  apifunc.get_resources(key,function(err,result){
    if(err){
      res.status(500).json(report('rid obtain err',err));
      return;
    }

    //success
    res.json(report(result));
  });
});

api.get('/resources/get/:rid',function(req,res){
  var key = req.params.rid;
  //load from db
  apifunc.get_resources(key,function(err,robject){
    if(err){
      res.status(404).json(report('rid obtain err',err));
      return;
    }
    //success

    fastest_file_from_paths(settings.resource_paths,robject.sname,function(err,best_filepathname){
      if(err){
        res.status(404).json(report('filenotexisterr',err));
        return;
      }

      //if file exists somewhere
      res.setHeader('Content-disposition', 'inline; filename=' + robject.oname);
      res.setHeader('Content-type', robject.mime);

      var filestream = fs.createReadStream(best_filepathname);
      console.log(best_filepathname.green);
      filestream.pipe(res);
    });
  });
});

//parse body. expect JSON
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
      res.status(500).json(report('err',err));
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
      res.status(500).json(report('dbfailure',err));
    }
  );
});

//----
//counter increment api
api.get('/new/:countername',(req,res)=>{
  //queryfunc.incr_counter('threads',callback);
  queryfunc.incr_counter(req.params.countername,(err,id)=>{
    if(err){
      res.status(500).json(report(req.params.countername +' retrieval error',err));
    }else{
      res.json(report(id));
    }
  });
});

//POST /forum/:fid
api.post('/forum/:fid',(req,res,next)=>{
  var r = validation.validatePost(req.body);
  if(r!=true)//if failed to validate
  {
    next(r);
    return;
  }

  apifunc.post_to_forum(req.body,req.params.fid.toString(),(err,result)=>{
    if(err){
      //res.json(report('mmm',err));
      res.status(500).json('cant post to forum',err);
    }else{
      var k =result;
      k.redirect = 'thread/'+ queryfunc.result_reform(k).id;
      res.json(report(k));
    }
  });
});

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
      res.status(500).json(report('pid not found within /posts/',err));
    }
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
    res.json(report(result));
  });
});

///POST /thread/* handler
api.post('/thread/:tid',function(req,res,next){
  var r = validation.validatePost(req.body);
  if(r!=true)//if failed to validate
  {
    next(r);//err thrown
    return;
  }

  apifunc.post_to_thread(req.body,req.params.tid,(err,result)=>{
    if(err){
      res.status(500).json(report('error in /thread/post',err));
    }else{
      var k = {};
      k.redirect = 'thread/' + result;
      res.json(report(k));
    }
  },
  false);
});

//GET /forum/*
api.get('/forum/:fid',(req,res)=>{
  apifunc.get_threads_from_forum_as_forum({
    fid:req.params.fid,
    start:req.query.start,
    count:req.query.count,
  },
  (err,data)=>{
    if(!err)
    {
      res.json(report(data));
    }
    else{
      res.status(500).json(report('cant get /forum/:fid',err));
    }
  });
});

if(development){
  //GET /user
  api.get('/user/get/:uid',(req,res)=>{
    apifunc.get_user(req.params.uid,(err,back)=>{
      if(err){
        res.status(500).json(report('cant get user',err));
      }
      else{
        res.json(report(back));
      }
    });
  });
}

//POST /user/login
//test if user exists. if exist generate cookie.
api.post('/user/login',(req,res,next)=>{
  var loginobj = req.body;
  apifunc.verify_user(loginobj,(err,back)=>{
    if(err){return next(err);}
    if(!back){return next('unmatch');}

    //if user exists
    var cookieobj = {
      username:back.username,
      uid:back._key,
      lastlogin:Date.now(),
    }

    //put a signed cookie in header
    res.cookie('userinfo',JSON.stringify(cookieobj),{
      signed:true,
      maxAge:(86400*30*1000),
      encode:String,
    });
    var signed_cookie = res.get('set-cookie');

    //put the signed cookie in response, also
    res.send(report({'cookie':signed_cookie,'instructions':
    'please put this cookie in request header for api access'}));

  });
});

var regex_validation = require('nkc_regex_validation');
//POST /user
api.post('/user',(req,res)=>{
  var userobj = req.body;
  var violating = regex_validation.validate(userobj);
  if(violating){
    res.status(500).json(report('violated',violating));
    return;
  }

  apifunc.create_user(userobj,(err,back)=>{
    if(err){
      res.status(500).json(report('cant create user',err));
    }
    else{
      res.json(report(back));
    }
  });
});

//logout of USER
//GET /user/logout
api.get('/user/logout',(req,res)=>{
  //put a signed cookie in header
  res.cookie('userinfo',{info:'nkc_logged_out'},{
    signed:true,
    expires:(new Date(Date.now()-86400000)),
    encode:String,
  });

  var signed_cookie = res.get('set-cookie');

  //put the signed cookie in response, also
  res.send(report({'cookie':signed_cookie,'instructions':
  'you have logged out'}));
});

api.get('*',(req,res)=>{
  res.status(404).json(
    report('endpoint not exist','endpoint not exist')
  );
});

//unhandled error handler
api.use((err,req,res,next)=>{
  res.status(500).json(report('error within /api',err));
});

exports.route_handler = api;

//api request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
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
var im = require('im_functions');

///------------
///something here to be executed before all handlers below
api.use(function(req,res,next){
  next();
});

//multi-part parsing.
//note that multer is applied AFTER body-parser.
var upload = multer(settings.upload_options);
api.post('/resources', upload.single('file'), function (req, res, next) {
  //obtain user first
  if(!req.user)
  {
    return next('who are you? log in first.');
  }

  // req.file is the `file` file
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
    if(err)return next(err);

    //rid got
    var robject = {
      _key:rid,
      oname:req.file.originalname,//原名
      sname:req.file.filename,//存储名
      size:req.file.size,
      mime:req.file.mimetype,
      username:req.user.username,
      uid:req.user._key,
    };

    //storage into db
    queryfunc.doc_save(robject,'resources',function(err,result){
      if(err)return next(err);

      //success
      result.rid = result['_key'];
      res.obj = result;
      return next();
    });
  });
});

fs.mkdirp(settings.avatar_path); //place for avatars to move to after upload

var avatar_upload = multer(settings.upload_options_avatar);
api.post('/avatar', avatar_upload.single('file'), function(req,res,next){
  console.log(req.file);
  if([
    'image/jpeg',
    'image/png',
  ].indexOf(req.file.mimetype)<0)//if not the right type of file
  return next('wrong mimetype for avatar');
  //obtain user first
  if(!req.user)return next('who are you? log in first.');

  //otherwise should we allow..

  //process the avatar image.
  im.avatarify(req.file.path,(err,back)=>{
    //if the uploaded file has problems (not an actural image?)
    if(err)return next(err);

    var destination_path = settings.avatar_path+req.user._key+'.jpg';
    //delete before move
    fs.unlink(destination_path,function(err){
      if(err)report('avatar dest unlink err',err); //ignore

      fs.move( //move to avatar path
        req.file.path,
        destination_path,
        function(err){
          if(err)
          {
            return next(err);
          }

          //finally here
          res.obj = destination_path;
          return next();
        }
      );
    });
  });
});


api.get('/avatar/:uid',function(req,res){
  var uid = req.params.uid;

  //success
  fastest_file_from_paths(
    settings.avatar_paths, //from these path
    uid+'.jpg', //get this file
    function(err,best_filepathname){
      if(err){
        //return res.status(404).json(report('image not exist',err));
        best_filepathname = settings.default_avatar_path //set default_avatar
      }

      //if file exists somewhere
      res.setHeader('Content-disposition', 'inline; filename=' + uid+'.jpg');
      res.setHeader('Content-type', 'image/jpeg');

      res.sendFile(best_filepathname);
    }
  );
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
api.get('/posts/:pid', function (req, res, next){
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

if(development){
  //GET /user
  api.get('/user/get/:uid',(req,res,next)=>{
    apifunc.get_user(req.params.uid,(err,back)=>{
      if(err)return next(err);
      res.obj = back;next();a
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
    res.obj = {'cookie':signed_cookie,'instructions':
    'please put this cookie in request header for api access'};

    next();
  });
});

var regex_validation = require('nkc_regex_validation');
//POST /user
api.post('/user',(req,res,next)=>{
  var userobj = req.body;
  var violating = regex_validation.validate(userobj);
  if(violating)return next(violating);

  apifunc.create_user(userobj,(err,back)=>{
    if(err)return next(err);
    res.obj = back;
    next();
  });
});

//logout of USER
//GET /user/logout
api.get('/user/logout',(req,res,next)=>{
  //put a signed cookie in header
  res.cookie('userinfo',{info:'nkc_logged_out'},{
    signed:true,
    expires:(new Date(Date.now()-86400000)),
    encode:String,
  });

  var signed_cookie = res.get('set-cookie');

  //put the signed cookie in response, also
  res.obj = {'cookie':signed_cookie,'instructions':
  'you have logged out. now replace existing cookie with this one'};

  next();
});

//send apidata back to client
api.use((req,res,next)=>{
  if(res.obj)
  {
    try{res.json(report(res.obj));}
    catch(e){return next(e);}
    return;
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

  res.status(500).json(report('error within /api',err));
});

exports.route_handler = api;

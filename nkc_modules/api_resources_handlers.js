//api resources request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');
var multer = require('multer'); //multi-part parser, for upload

var async = require('async');
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
  if(!req.user)return next('who are you? log in first.');
  if(!req.file)return next('shit not even a file. fuck.')

  if([
    'image/jpeg',
    'image/png',
  ].indexOf(req.file.mimetype)>=0)//if is processable image
  {
    if(req.file.size>settings.size_largeimage)//if file is larger than specified size
    {
      im.attachify(req.file.path)
      .then(back=>{
        //after conversion
        res.isImage = true;
        return next();
      })
      .catch(next)
    }
    else{
      //if file smaller than specified size
      im.info(req.file.path)
      .then(info=>{
        if((info.width<200&&info.height<400)||info.height<400||info.width<300)
        {// if canvas too small, no watermark thx
          res.isImage = true;
          return next();
        }
        //else
        return im.watermarkify(req.file.path)
      })
      .then(back=>{
        res.isImage = true;
        return next();
      })
      .catch(next)
    }
  }
  else{
    //if not image, just usual file
    res.isImage = false;
    return next();
  }
  //deal the rest in next api.use
});

api.use((req,res,next)=>{
  if(res.isImage!==true&&res.isImage!==false)return next();
  //skip if not from upload operation.

  //upload operation continues here.

  // req.file is the `file` file
  // req.body shall hold the text fields, if there were any
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
  apifunc.get_new_rid()
  .then(rid=>{
    var extension = req.file.originalname.match(/^.*\.(.*)$/);
    extension = extension?'.'+extension[1]:'';

    var savingname = rid + extension;

    var relative_path = settings.get_relative_path();

    var destination_path = settings.upload_path;
    var destination_file = destination_path + '/'+relative_path+'/'+savingname;

    fs.mkdirp(destination_path + '/'+relative_path+'/',function(err){
      if(err)return next('shit, shouldnt really happen, fuck');
      //just to make VERY sure the directory exists.

      fs.rename( //move to where uploaded files belong
        req.file.path,
        destination_file,
        function(err){
          if(err)
          {
            return next(err);
          }

          //can store into DB now
          var robject = {
            _key:rid,
            oname:req.file.originalname,//原名
            sname:savingname,//存储名
            rpath:relative_path,//子路径，应为相对路径。
            size:req.file.size,
            mime:req.file.mimetype,
            //username:req.user.username,
            uid:req.user._key,
            toc:Date.now(), //time of creation.
          };

          //store into db
          queryfunc.doc_save(robject,'resources')
          .then(result=>{
            robject.rid = rid;
            res.obj = robject;
            return next();
          })
          .catch(next);
        }
      );
    });
  })
  .catch(next)
});


fs.mkdirp(settings.avatar_path); //place for avatars to move to after upload

var avatar_upload = multer(settings.upload_options_avatar);
api.post('/avatar', avatar_upload.single('file'), function(req,res,next){
  if(!req.file)return next('shit not even a file. fuck.');

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
  im.avatarify(req.file.path)
  .then((back)=>{
    //if the uploaded file has problems (not an actural image?)
    if(err)return next(err);

    var destination_file = settings.avatar_path+req.user._key+'.jpg';
    //delete before move
    fs.unlink(destination_file,function(err){
      if(err)report('avatar dest unlink err',err); //ignore

      fs.move( //move to avatar path
        req.file.path,
        destination_file,
        function(err){
          if(err)
          {
            return next(err);
          }

          //finally here
          res.obj = destination_file;
          return next();
        }
      );
    });

  })
  .catch(next)
});

api.get('/resources/info/:rid',function(req,res,next){
  var key = req.params.rid;
  //load from db
  apifunc.get_resources(key)
  .then(result=>{
    //success
    res.obj = result;
    return next();
  })
  .catch(next);
});

fs.mkdirp(settings.thumbnails_path);

api.get('/resources/mine',function(req,res,next){
  if(!req.user)return next('login please.')
  //
  //get rid from db where:
  //username == req.user.username
  //sort by time, desc, first 10

  queryfunc.doc_list({
    start:req.query.start,
    count:req.query.count,
    type:'resources',
    filter_by:'uid',
    equals:req.user._key, //uid
    sort_by:'toc',
    order:'desc',
  })
  .then(function(back){
    res.obj = back;
    return next();
  })
  .catch(next)

});

module.exports = api;

//api resources request handlers


var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var nkcfs = require('./nkc_fs')
var settings = require('./server_settings.js');
var helper_mod = require('./helper.js')();
var bodyParser = require('body-parser');
var multer = require('multer'); //multi-part parser, for upload

var async = require('async');
var express = require('express');
var api = express.Router();

var validation = require('./validation');
var apifunc = require('./api_functions');
var queryfunc = require('./query_functions');
var im = require('./im_functions');
const db = queryfunc.getDB();
const aql = queryfunc.getAql();

///------------
///something here to be executed before all handlers below
api.use(function(req,res,next){
  next();
});

//multi-part parsing.
//note that multer is applied AFTER body-parser.
var upload = multer(settings.upload_options);
api.post('/resources', upload.single('file'), function (req, res, next) {
  if(!req.user) return next('who are you? log in first.');
  if(!req.file) return next('shit not even a file. fuck.')

  var file = req.file
  var originalName = file.originalname
  var size = file.size
  var tempFilePath = file.path
  var mimetype = file.mimetype

  var extension = nkcfs.getExtensionFromFileName(originalName)
  if(!extension)extension = require('mime').extension(mimetype)||null

  Promise.resolve()
  .then(()=>{
    //obtain user first
    if(!req.user) throw('who are you? log in first.');
    if(!req.file) throw('shit not even a file. fuck.')

    if(['jpg','jpeg','png'].indexOf(extension)>=0)//if is processable image
    {
      if(size>settings.size_largeimage){ //if file larger than specified size
        return im.attachify(tempFilePath)
      }
      //if not really large
      else {
        return im.info(tempFilePath)
        .then(info=>{
          if((info.width<200&&info.height<400)||info.height<400||info.width<300)
          {// if canvas too small, no watermark thx
            return true
          }
          return im.watermarkify(tempFilePath)
        })
      }
    }
    //if not image
    return false
  })
  .then(isImage=>{
    console.log(file);
    // req.file is the `file` file
    // req.body shall hold the text fields, if there were any

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

    //obtain an rid now
    return apifunc.get_new_rid()
  })
  .then(rid=>{

    var savingname = rid + (extension?'.'+extension:'');
    var relative_path = settings.get_relative_path();

    var destination_path = settings.upload_path + relative_path;
    var destination_file = destination_path + savingname;

    return nkcfs.ensureDir(destination_path)
    .then(()=>{
      var Promisify = require('./promisify')
      return Promisify(fs.rename)(tempFilePath,destination_file)
    })
    .then(()=>{
      //can store into DB now
      var robject = {
        _key:rid,
        oname:originalName,
        path:relative_path+savingname,
        ext:extension,
        size,
        //username:req.user.username,
        uid:req.user._key,
        toc:Date.now(), //time of creation.
      };

      //store into db
      return queryfunc.doc_save(robject,'resources')
      .then(result=>{
        return robject
      })
    })
  })
  .then(robject=>{
    res.obj = robject
    next();
  })
  .catch(next)
})

var avatar_upload = multer(settings.upload_options_avatar);
api.post('/avatar', avatar_upload.single('file'), function(req,res,next){
  if(!req.file)return next('shit not even a file. fuck.');

  report(req.file);
  if([
    'image/jpeg',
    'image/png',
  ].indexOf(req.file.mimetype)<0)//if not the right type of file
  return next('wrong mimetype for avatar');
  //obtain user first
  if(!req.user)return next('who are you? log in first.');

  //otherwise should we allow..

  var upath = req.file.path
  console.log(upath);

  //process the avatar image.
  im.avatarify(upath) // avatarify in place
  .then((back)=>{
    var destination_file_small = settings.avatar_path_small+req.user._key+'.jpg';

    return nkcfs.copy(upath,destination_file_small,{clobber:true}) //make a copy
    .then(()=>{
      return im.avatarify_small(destination_file_small) //avatarify in place on the copy
    })
    .then(()=>{
      var destination_file = settings.avatar_path+req.user._key+'.jpg';
      return nkcfs.move(upath,destination_file,{clobber:true}) //move the original
    })
  })
  .then((back)=>{
    res.obj = 'success'
    return
  })
  .then(next)
  .catch(next)
});

const UOPFA = multer(settings.uploadOptionsPersonalForumAvatar);
api.post('/personalForumAvatar', UOPFA.single('file'), function(req, res, next) {
  if(!req.file)return next('shit not even a file. fuck.');
  const id = req.query.id;
  const user = req.user;
  report(req.file);
  if([
      'image/jpeg',
      'image/png',
    ].indexOf(req.file.mimetype)<0)//if not the right type of file
    return next('wrong mimetype for avatar...jpg or png only.');
  //obtain user first
  if(!req.user)return next('who are you? log in first.');

  //otherwise should we allow..

  var upath = req.file.path
  return db.collection('personalForums').document(id)
    .then(pf => {
      if(pf.moderators.indexOf(user._key) > -1)
        return im.avatarify(upath) // avatarify in place
      throw '权限不足'
    })
    .then((back)=>{
      var destination_file_small = settings.personalForumAvatarPath + id + '.jpg';
      return nkcfs.copy(upath,destination_file_small,{clobber:true})
    })
    .then((back)=>{
      res.obj = 'success';
      return
    })
    .then(next)
    .catch(next)
});

const UOPFB = multer(settings.uploadOptionsPersonalForumBanner);
api.post('/personalForumBanner', UOPFB.single('file'), function(req, res, next) {
  if(!req.file)return next('shit not even a file. fuck.');
  const id = req.query.id;
  const user = req.user;
  report(req.file);
  if([
      'image/jpeg',
      'image/png',
    ].indexOf(req.file.mimetype)<0)//if not the right type of file
    return next('wrong mimetype for avatar...jpg or png only.');
  //obtain user first
  if(!req.user)return next('who are you? log in first.');

  //otherwise should we allow..

  var upath = req.file.path
  return db.collection('personalForums').document(id)
    .then(pf => {
      if(pf.moderators.indexOf(user._key) > -1)
        return im.bannerify(upath); // avatarify in place
      throw '权限不足'
    })
    .then((back)=>{
      var destination_file = settings.personalForumBannerPath+ id +'.jpg';
      return nkcfs.copy(upath,destination_file,{clobber:true})
    })
    .then((back)=>{
      res.obj = 'success';
      return
    })
    .then(next)
    .catch(next)
});

module.exports = api;

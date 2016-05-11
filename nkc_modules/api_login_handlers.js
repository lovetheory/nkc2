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

if(development){
  //GET /user
  api.get('/user/get/:uid',(req,res,next)=>{
    apifunc.getuser(req.params.uid)
    .then(back=>{
      res.obj = back;
      next()
    })
    .catch(next);
  });
}

//POST /user/login
//test if user exists. if exist generate cookie.
api.post('/user/login',(req,res,next)=>{
  var loginobj = req.body;

  apifunc.verify_user(loginobj)
  .then(back=>{
    if(!back)throw 'unmatch';

    //if user exists
    var cookieobj = {
      username:back.username,
      uid:back._key,
      lastlogin:Date.now(),
    }

    //put a signed cookie in header
    res.cookie('userinfo',JSON.stringify(cookieobj),{
      signed:true,
      maxAge:settings.cookie_life,
      httpOnly:true,
    });
    var signed_cookie = res.get('set-cookie');

    //put the signed cookie in response, also
    res.obj = {'cookie':signed_cookie,'instructions':
    'please put this cookie in request header for api access'};

    next();
  })
  .catch(next);
});

var regex_validation = require('nkc_regex_validation');
//POST /user
api.post('/user',(req,res,next)=>{
  var userobj = req.body;
  var violating = regex_validation.validate(userobj);
  if(violating)return next(violating);

  if(userobj.password!==userobj.password2)return next('password does not match');
  if(!userobj.email)return next('emailess')
  if(!userobj.username)return next('nameless')

  if(!userobj.regcode)return next('regcodeless')

  queryfunc.doc_load(userobj.regcode,'answersheets')
  .catch(err=>{
    throw ('failed reconizing regcode')
  })
  .then(ans=>{
    if(Date.now() - ans.tsm>settings.exam.time_before_register)
    throw ('expired, consider re-take the exam.')

    return apifunc.create_user(userobj)
  })
  .then(back=>{
    res.obj = back;
    next();
  })
  .catch(next);

  // queryfunc.doc_load(userobj.regcode,'answersheets',function(err,ans){
  //   if(err)return next('failed reconizing regcode')
  //   if(Date.now() - ans.tsm>settings.exam.time_before_register)return next('expired, consider re-take the exam.')
  //
  //   apifunc.create_user(userobj,(err,back)=>{
  //     if(err)return next(err);
  //     res.obj = back;
  //     next();
  //   });
  //
  // })
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

module.exports = api;

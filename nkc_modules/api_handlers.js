//api request handlers


var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('./server_settings.js');
var helper_mod = require('./helper.js')();
var bodyparser = require('body-parser');
let apiResourcesHandlers = require('./api_resources_handlers.js');
var jaderender = require('./jaderender');

var express = require('express');
var api = express.Router();

///something here to be executed before all handlers below
api.use(function(req,res,next){
  next();
});

//api_resouces_handlers
api.use(apiResourcesHandlers);

var multer = require('multer'); //multi-part parser, for upload
var upload = multer({limits:{files:0,parts:100}})
//fuck submail: they dont use json.
api.post('/receiveMobileMessage',upload.array(),function(req,res,next){
var layer = require('layer')
var params = req.body

    var mobile = params.address
    var type = params.events
    var content = params.content

    var mlog = new layer.BaseDao('mobilelogs')
    return mlog.save({
      toc:Date.now(),
      mobile,
      content,
      type,
    })
    .then(m=>{
      res.send('success')
    })
	.catch(next)
  
})

//parse body. expect JSON;
api.use(bodyparser.json());
api.use(bodyparser.urlencoded({ extended: true }));



api.use(function(req,res,next){
  //if(!req.body&&req.method=='POST')throw ('bodyless POST request');
  next();
});

//new API
api.use(require('./api_operation_handlers.js'));

//send apidata back to client
api.use((req,res,next)=>{
  if(res.sent){
    return;
  }

  var obj = res.obj
  if(obj!==undefined) //if not undefined
  {
    if(!obj.template){
      return res.json(report(obj));
      //return without continue
    }
    //if template specified
    var k = jaderender(obj.template,obj)
    return res.send(k);
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
    fs.unlink(req.file.path,(err)=>{
      if(err)report('error unlinking file, but dont even care',err);
    });
  }

  if(res.obj){
    if(res.obj.template){ //if html output is chosen
      throw err //let server.js error handler catch.
    }
  }

  if(typeof err ==='number')return res.status(err).end()

  res.status(500).json(report('error within /api',err));
});

exports.route_handler = api;

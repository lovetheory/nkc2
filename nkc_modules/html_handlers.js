//api request handlers
module.paths.push('./nkc_modules'); //enable require-ment for this path

var fs=require('fs');
var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var jaderender = require('jaderender');

var request = require('request');
var jade = require('jade');
var express = require('express');
var handler = express.Router();

///------------
///to be executed before all handlers below
handler.use(function(req,res,next){
  next();
});

handler.use('/jade/',express.static('nkc_modules/jade')); //file serving

//var hellojade = jade.compileFile('./nkc_modules/jade/hello.jade',jadeoptions)

handler.get('/jade/:fn',(req,res,next)=>{
  var opt = {};
  opt.address = req.ip.toString();
  opt.url = req.originalUrl;

  fs.access('nkc_modules/jade/'+req.params.fn+'.jade', fs.R_OK , function (err) {
    if(err){
      //pass next
      next();
    }else{
      try{
        res.send(jaderender('nkc_modules/jade/'+req.params.fn+'.jade',opt));
      }
      catch(err){
        next(err);
      }
    }
  });
});

//unhandled error will be routed back to server.js

exports.route_handler = handler;

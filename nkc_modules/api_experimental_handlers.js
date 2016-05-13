//api content request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var express = require('express');
var api = express.Router();

var APIroutine = require('api_experimental_routine')

api.use('/experimental', (req,res,next)=>{
  if(req.method=='POST')return next()

  for(key in req.query){
    req.body[key] = req.query[key]
  }
  next()
})

api.all('/experimental',function(req,res,next){
  APIroutine({
    user:req.user,
    body:req.body,

    _req:req, //Use of these two are not encouraged. For special purpose APIs only.
    _res:res,
  })
  .then((result)=>{
    res.obj = result;
  })
  .then(next)
  .catch(next)
})

module.exports = api;

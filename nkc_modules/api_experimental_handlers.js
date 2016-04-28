//api content request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var express = require('express');
var api = express.Router();

var validation = require('validation');

///------------
///something here to be executed before all handlers below
api.use(function(req,res,next){
  next();
});

api.get('/failure',function(req,res,next){
  var alpha = 0
  res.obj = {
    wrong:1/alpha,
  }
  next();
})

var modificationAPI = require('api_experimental_modifications')

api.post('/modification',function(req,res,next){
  modificationAPI(req,res)
  .then((result)=>{
    res.obj = result;
  })
  .then(next)
  .catch(next)
})

module.exports = api;

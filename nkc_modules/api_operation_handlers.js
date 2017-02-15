
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var express = require('express');
var jaderender = require('jaderender')
var api = express.Router();
var helper_mod = require('helper')()

var queryfunc = require('query_functions')

api.use('/operation', (req,res,next)=>{
  if(req.method=='POST'){
    if(req.query.operation){
      req.body.operation = req.query.operation
    }
    return next()
  }

  for(key in req.query){
    req.body[key] = req.query[key]
  }
  next()
})

api.all('/operation',function(req,res,next){
  APIroutine({
    user:req.user,
    body:req.body,

    _req:req, //Use of these are not encouraged. For special purpose APIs only.
    _res:res,
    _next:next,
  })
  .then((result)=>{
    res.obj = result
    return undefined
  })
  .then(next)
  .catch(next)
})

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

//unhandled error handler
api.use((err,req,res,next)=>{

  if(req.file)
  {
    //delete uploaded file when error happens
    fs.unlink(req.file.path,(err)=>{
      if(err)report('error unlinking file, but dont even care',err);
    });
  }

  if(res.sent){
    report('possible transmission err',err)
    return;
  }

  if(typeof err ==='number'){
    return res.status(err).end()
  }

  if((res.obj&&res.obj.template)||req.accepts('html')&&(!req.is('json'))){

    res.status(500).send(
      jaderender('nkc_modules/jade/500.jade',{
        url:req.originalUrl,
        err:err.stack?err.stack:JSON.stringify(err),
      })
    );
    return undefined;
  }

  res.status(500).json(report('error within /api/operation',err));

  //all errors should be handled here.
});

api.use((err,req,res,next)=>{
  //error happened during transmission of response
  report('/api/operation: possible transmission err',err)
})

module.exports = api;

//---------------------------------------------------------------------------------

var operations = require('api_operations')
var table = operations.table
var permission = require('permissions')

function verifySubmittedParams(params){
  //verify whether the submitted object is valid

  if(!params.operation)throw 'no operation specified'
  var operation = table[params.operation]

  if(!operation) throw 'operation n/a, typo?'

  if(operation.requiredParams){
    for(i in operation.requiredParams){
      if(params[i]===undefined||params[i]===null) throw '缺少参数 missing parameter: '+i
    }
  }

  return true;
}

function testPermission(params){
  // test if user is applicapable of executing operation specified by params.
  var permissionList = permission.getPermissionsFromUser(params.user);
  report(permissionList);

  if(!permissionList.permittedOperations[params.operation]){ //user does not have permission for this operation
    throw '权限不足。permission denied.'
  }

  Object.assign(params,permissionList)
  // {
  //   permittedOperations:Object,
  //   content_class:Object,
  // }

  var operation = params.operation

  if(table[operation].testPermission){
    return Promise.resolve(params)
    .then(table[operation].testPermission)
    .catch(err=>{
      report('permission test failed')
      throw err
    })
  }
  return
}

function executeOperation(params)
{
  if(!table[params.operation].operation)
  throw '此操作不存在。operation function n/a, contact developer'
  return table[params.operation].operation(params);
}

function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop)&&obj[prop]!==null&&obj[prop]!==undefined)
    return false;
  }
  return true && JSON.stringify(obj) === JSON.stringify({});
}

//requires:
//  req.body
//  req.user
//returns:
//  Promise
function APIroutine(context){
  var initTimeStamp = Date.now()

  if(!context.body) throw 'submit with body, please'
  var params = context.body; //parameter object

  if(!params.operation)throw '请在请求中指定一个operation。please specify an operation in your request body object'
  report(params);

  var _copy = Object.assign({},context.body) //made a copy
  _copy.operation = undefined
  _copy[''] = undefined

  params._copy = isEmpty(_copy)?undefined:_copy;

  verifySubmittedParams(params); //check whether all required parameters presents

  params.user = context.user
  params._req = context._req
  params._res = context._res

  return Promise.resolve()
  .then(()=>{
    return testPermission(params)
  })
  .then(()=>{
    //passed all test
    return executeOperation(params)
  })
  .then(result=>{
    report('operation '+params.operation+' successfully executed')

    var endTimeStamp = Date.now()
    var duration = endTimeStamp - initTimeStamp

    //check: only save user requests, ignore visitors
    if(params.user||isSpecialOperation(params.operation)){
      queryfunc.doc_save({
        ip:params._req.iptrim,
        op:params.operation,
        uid:params.user?params.user._key:'visitor',
        t0:initTimeStamp,
        t1:duration,
        params:params._copy,
      },'logs')
    }
    return result
  })
  .catch(err=>{
    report('bad','operation '+params.operation+' failed')

    var endTimeStamp = Date.now()
    var duration = endTimeStamp - initTimeStamp

    if(params.user||isSpecialOperation(params.operation)){
      queryfunc.doc_save({
        ip:params._req.iptrim,
        op:params.operation,
        uid:params.user?params.user._key:'visitor',
        t0:initTimeStamp,
        t1:duration,
        params:params._copy,
        error:err.toString(),
      },'logs')
    }

    throw err
  })
}

function isSpecialOperation(str){
  return existInArr(str,[
    'userLogin',
    'submitExam',
    'userRegister'
  ])
}

function existInArr(thing,arr){
  for(var i in arr){
    if(arr[i]===thing){
      return true
    }
  }
  return false
}

function unittest(){
  console.log(isSpecialOperation('userLogin'));
  console.log(isSpecialOperation('userlogin'));
  console.log(isSpecialOperation('submitExam'));
}

if(development)unittest();

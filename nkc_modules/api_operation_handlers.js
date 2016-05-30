
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var express = require('express');
var api = express.Router();

api.use('/operation', (req,res,next)=>{
  if(req.method=='POST')return next()

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
    return 
  })
  .then(next)
  .catch(next)
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
      if(!params[i]) throw 'missing parameter: '+i
    }
  }

  return true;
}

function testPermission(params){
  // test if user is applicapable of executing operation specified by params.
  var permissionList = permission.getPermissionsFromUser(params.user);
  report(permissionList);

  if(!permissionList.permittedOperations[params.operation]){ //user does not have permission for this operation
    throw 'permission denied.'
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
  throw 'operation function n/a, contact developer'
  return table[params.operation].operation(params);
}

//requires:
//  req.body
//  req.user
//returns:
//  Promise
function APIroutine(context){

  if(!context.body) throw 'submit with body, please'
  var params = context.body; //parameter object
  if(!params.operation)throw 'please specify an operation in your request body object'
  report(params);
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
    return result
  })
}

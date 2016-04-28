//api content request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var operationTable = require('api_experimental_operation_table').modificationTable

function verifySubmittedParams(params){
  //verify whether the submitted object is valid

  if(!params.operation)throw 'no operation specified'
  operation = operationTable[params.operation]
  if(!operationTable[params.operation]) throw 'operation n/a, typo?'

  if(operation.requiredParams){
    for(i in operation.requiredParams){
      if(!params[i]) throw 'missing parameter'+i
    }
  }
  return true;
}

function getPermissionList(user){
  //retain a list of permissions from user's certs property.

  if(!user.certs||user.certs.length)throw 'user\'s got no certifications'
  var permissionList = ['moveThread','editPost','replyToThread','replyToThread'];
  //permissionList = getPermissionFromCerts(user.certs)

  return permissionList;
}

function testPermission(params){
  // test if user is applicapable of executing operation specified by params.
  var permissionList = getPermissionList(params.user);
  report(permissionList);

  if(permissionList.indexOf(params.operation)<0){ //user does not have permission.
    throw 'permission denied'
  }
  if(operationTable[params.operation].testPermission){
    return operationTable[params.operation].testPermission(params)
    .catch(err=>{
      throw 'permission test failed'
    })
  }
  return Promise.resolve()
}

function executeOperation(params)
{
  return operationTable[params.operation].operation(params);
}

//requires:
//  req.body
//  req.user
//returns:
//  Promise
function modificationAPI(req,res){
  if(!req.body) throw 'submit with body, please'
  var params = req.body; //parameter object
  report(params);
  verifySubmittedParams(params); //check whether required parameters presents

  params.user = req.user

  return testPermission(params)
  .then(()=>{
    //passed all test
    return executeOperation(params)
  })
  .then((result)=>{
    report('operation '+params.operation+' successfully executed')
    return result
  })
}

module.exports = modificationAPI

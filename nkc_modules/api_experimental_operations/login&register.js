module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var validation = require('validation')
var AQL = queryfunc.AQL
var apifunc = require('api_functions')

var table = {};
module.exports = table;

var regex_validation = require('nkc_regex_validation');

table.userRegister = {
  operation:function(params){
    var userobj = {
      username:params.username,
      password:params.password,
      email:params.email,
      regcode:params.regcode,
    }

    regex_validation.validate(params)

    if(params.password!==params.password2)throw 'passwords does not match'

    return queryfunc.doc_load(userobj.regcode,'answersheets')
    .catch(err=>{
      throw ('failed reconizing regcode')
    })
    .then(ans=>{
      if(Date.now() - ans.tsm>settings.exam.time_before_register)
      throw ('expired, consider re-take the exam.')
      return apifunc.create_user(userobj)
    })

  },
  requiredParams:{
    username:String,
    password:String,
    password2:String,
    email:String,
    regcode:String,
  },
}

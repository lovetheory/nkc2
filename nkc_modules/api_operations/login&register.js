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

table.userLogin = {
  operation:function(params){
    return apifunc.get_user_by_name(params.username)
    .then((back)=>{
      if(back.length!==1)//user not exist
      throw ('user not exist by name');

      var user = back[0]
      //if user exists
      if(user.password !== params.password){
        throw ('password unmatch')
      }


      //if user exists
      var cookieobj = {
        username:user.username,
        uid:user._key,
        lastlogin:Date.now(),
      }

      //put a signed cookie in header
      params._res.cookie('userinfo',JSON.stringify(cookieobj),{
        signed:true,
        maxAge:settings.cookie_life,
        httpOnly:true,
      });

      var signed_cookie = params._res.get('set-cookie');

      //put the signed cookie in response, also
      return {'cookie':signed_cookie,'instructions':
      'please put this cookie in request header for api access'};
    })
  },
  requiredParams:{
    username:String,
    password:String,
  },
}

table.userLogout = {
  operation:function(params){
    var data = {}

    data.user = undefined
    params._res.cookie('userinfo',{info:'nkc_logged_out'},{
      signed:true,
      expires:(new Date(Date.now()-86400000)),
    });

    var signed_cookie = params._res.get('set-cookie');

    //put the signed cookie in response, also
    Object.assign(data, {'cookie':signed_cookie,'instructions':
    'you have logged out. you may replace existing cookie with this one'})

    return data;
  },
}

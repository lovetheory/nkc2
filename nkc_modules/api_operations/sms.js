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

var layer = require('layer')

var permissions = require('permissions')

var table = {};
module.exports = table;

var incrementPsnl = function(key){
  var psnl = new layer.Personal(key)
  return psnl.load()
  .then(psnl=>{
    return psnl.update({new_message:(psnl.model.new_message||0)+1})
  })
}

table.sendShortMessageByUsername = {
  operation:function(params){
    var destusername = params.username
    var c = params.c //content
    validation.validateSMS({c})

    var u = new layer.User()
    var s = new layer.ShortMessage()
    return u.loadByName(destusername)
    .then(u=>{
      return s.send({
        sender:params.user._key,
        receiver:u.model._key,
        content:c,
        ip:params._req.iptrim,
      })
    })
    .then(s=>{

      return incrementPsnl(u.model._key)
      .then(psnl=>{
        return s.model
      })
    })
  },
  requiredParams:{
    username:String,
    c:String,
  }
}

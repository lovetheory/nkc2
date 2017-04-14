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

var xsflimit = require('../misc/xsflimit')

table.getPostContent = {
  operation:function(params){
    var p = new layer.Post(params.pid)
    return p.load()
    .then(res=>{
      return p.mergeUsername()
    })
    .then(p=>{
      return xsflimit(p.model,params)
    })
  },
  requiredParams:{
    pid:String,
  }
}

table.kamikaze = {
  operation:function(params){
    setTimeout(function(){
      process.exit()
    }
    ,1000)
    return 'will restart after 1s'
  }
}

table.gitpull={
  operation:function(params){
    var elapsed = Date.now()
    var im = require('im_functions')
    return im.gitpull()
    .then(res=>{
      elapsed = Date.now()-elapsed
      return {message:`git pull successfully executed in ${elapsed} ms`}
    })
  }
}

table.npminstall={
  operation:function(params){
    var elapsed = Date.now()
    var im = require('im_functions')
    return im.npminstall()
    .then(res=>{
      elapsed = Date.now()-elapsed
      return {message:`npm install successfully executed in ${elapsed} ms`,
      stdout:res.stdout,
      stderr:res.stderr}
    })
  }
}

table.submitPersonalSetting = {
  operation:function(params){
    var post_sign = params.post_sign.toString().trim()
    var description = params.description.toString().trim()
    var color = params.color.toString().trim()
    var focus_forums = params.focus_forums.toString().trim()

    if(post_sign.length>300||description.length>300||color.length>10) throw 'section too long.'

    var user = new layer.User(params.user._key)
    return user.update({
      post_sign,
      description,
      color,
      focus_forums,
    })
    .then(u=>{
      return 'successfully updated personal settings'
    })
  },
  requiredParams:{
    post_sign:String,
    description:String,
    color:String,
    focus_forums:String,
  }
}

table.runAQL={
  operation:function(params){
    return AQL(params.query)
  }
}

var incrementPsnl = function(key){
  var psnl = new layer.Personal(key)
  return psnl.load()
  .then(psnl=>{
    return psnl.update({new_message:(psnl.model.new_message||0)+1})
  })
}

table.createReplyRelation = {
  init:()=>{
    queryfunc.createIndex('replies',{
      fields:['touid','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:function(params){
    var frompid = params.frompid
    var topid = params.topid
    var toc = Date.now()

    var p = new layer.Post(topid)
    return p.load()
    .then(p=>{
      var r = new layer.BaseDao('replies')
      var touid = p.model.uid

      return r.save({
        frompid,
        topid,
        touid,
        toc,
      })
      .then(r=>{
        return incrementPsnl(touid)
        .then(psnl=>{
          return {_key:r.key}
        })
      })
    })
  },
  requiredParams:{
    frompid:String,
    topid:String,
  }
}

table.getForumsOfZone = {
  operation:function(params){
    var fid = params.fid
    return AQL(`for f in forums filter f.parentid==@fid sort f.order return f`,{fid})
  },
  requiredParams:{
    fid:String,
  }
}

table.inviteUser = {
  init: () => {
    queryfunc.createIndex('invites', {
      fields:['ioc','touid'],
      type: 'skiplist',
      unique: 'false',
      sparse: 'false'
    })
  },
  operation: (params) => {
    let frompid = params.frompid;
    let touid = params.touid;
    let ioc = Date.now();
    let invite = new layer.BaseDao('invites');
    return invite.save({
      frompid,
      touid,
      ioc
    })
  }
}

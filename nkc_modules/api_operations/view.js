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

var jadeDir = __projectroot + 'nkc_modules/jade/'

var table = {};
module.exports = table;

function defaultData(params){ //default data obj for views
  var user = params?params.user:null
  return {
    site:settings.site,
    user,
  }
}

table.viewExam = {
  operation:function(params){
    var data = defaultData(params)

    data.template = 'nkc_modules/jade/interface_exam.jade' //will render if property 'template' exists

    if(params.user) throw ('to take exams, you must logout first.')

    if(params.result){
      data.detail = params.detail
      data.result = params.result
      return data;
    }

    return apifunc.exam_gen({ip:params._req.ip})
    .then(function(back){
      data.exam = back;
      return data;
    })
  },

  requiredParams:{

  },
}

table.viewRegister = {
  operation:function(params){
    var data = defaultData(params)

    data.code = params.code
    data.template = 'nkc_modules/jade/interface_user_register.jade'

    return data
  }
}

function getForumList() {
  return AQL(`
    for f in forums
    filter f.type == 'forum' && f.parentid !=null
    let nf = f

    collect parent = nf.parentid into forumgroup = nf
    let parentforum = document(forums,parent)
    let group =  {parentforum,forumgroup}
    sort group.parentforum.order asc
    return group
    `
  )
}

table.viewHome = {
  init:function(){
    return queryfunc.createIndex('threads',{
      fields:['fid','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+ 'interface_home.jade'

    return AQL(`
      for f in forums
      filter f.type == 'forum' && f.parentid !=null
      let threads =
      (
        for t in threads
        filter t.fid == f._key
        sort t.tlm desc
        limit 0,6

        let oc = document(posts,t.oc)
        return merge(t,{oc})
      )
      let nf = merge(f,{threads})

      collect parent = nf.parentid into forumgroup = nf
      let parentforum = document(forums,parent)
      let group =  {parentforum,forumgroup}
      sort group.parentforum.order asc
      return group
      `
    )
    .then(grouparray=>{
      data.grouparray = grouparray;
      //data.forums = forums;
      return data;
    })
  }
}

function get_all_forums(){
  return AQL
  (
    `for f in forums
    return f
    `
  )
}

table.viewForum = {
  init:function(){
    return queryfunc.createIndex('threads',{
      fields:['fid','tlm'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+ 'interface_forum.jade'
    var fid = params.fid;

    return AQL(`
      let forum = document(forums,@fid)
      let threads = (
        for t in threads
        filter t.fid == forum._key
        sort t.tlm desc
        limit @start,@count

        let oc = document(posts,t.oc)
        let lm = document(posts,t.lm)
        let ocuser = document(users,oc.uid)
        let lmuser = document(users,lm.uid)

        return merge(t,{oc,ocuser,lmuser})
      )
      return {forum,threads}

      `,
      {
        fid,
        start:0,
        count:100,
      }
    )
    .then((result)=>{
      //if nothing went wrong
      Object.assign(data,result[0])
      //return apifunc.get_all_forums()
      return getForumList()
    })
    .then(forumlist=>{
      data.forumlist = forumlist
      data.replytarget = 'forum/' + fid;
      return data
    })
  },
  requiredParams:{
    fid:String,
  }
}

table.viewThread = {
  init:function(){
    return queryfunc.createIndex('posts',{
      fields:['tid','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:params=>{
    var data=defaultData(params)
    data.template = jadeDir + 'interface_thread.jade'
    var tid = params.tid

    return AQL(
      `
      let thread = document(threads,@tid)

      let forum = document(forums,thread.fid)
      let oc = document(posts,thread.oc)

      let posts = (
        for p in posts
        filter p.tid == thread._key
        sort p.toc asc
        limit 0,50
        let user = document(users,p.uid)

        return merge(p,{user})
      )
      return {thread,oc,forum,posts}
      `,
      {
        tid,
      }
    )
    .then(result=>{
      Object.assign(data,result[0]);
      return getForumList()
    })
    .then(forumlist=>{
      data.forumlist = forumlist
      data.replytarget = 'thread/' + tid
      return data
    })
  },
  requiredParams:{
    tid:String,
  }
}

table.viewLogout = {
  operation:function(params){
    var data=defaultData(params)
    data.template = jadeDir+'interface_user_logout.jade'

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

table.viewLogin = {
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+'interface_user_login.jade'
    return data
  }
}

table.viewExperimental = {
  operation:params=>{
    var data = defaultData(params)
    data.template = jadeDir+'interface_experimental.jade'
    return data
  }
}

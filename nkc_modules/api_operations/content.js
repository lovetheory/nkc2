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

//post to a given thread.
var postToThread = function(post,tid,user){
  //check existence
  return queryfunc.doc_load(tid,'threads')
  .catch((err)=>{
    throw 'target thread not found'
  })
  .then((th)=>{
    //th is the thread object now

    //apply for a new pid
    return apifunc.get_new_pid();
  })
  .then((newpid) =>{
    //create a new post
    var timestamp = Date.now();
    var newpost = { //accept only listed attribute
      _key:newpid,
      tid,
      toc:timestamp,
      tlm:timestamp,
      c:post.c,
      t:post.t,
      l:post.l,
      uid:user._key,
      username:user.username,
    };

    //insert the new post into posts collection
    return queryfunc.doc_save(newpost,'posts')
  })
  .then(saveResult=>{
    //update thread object to make sync
    return update_thread(tid)
    .then(r=>{
      saveResult.tid = tid;
      saveResult.redirect = '/thread/' + tid.toString()
      return saveResult;
    })
    //okay to respond the user
  })
};

var postToForum = function(post,fid,user){
  post.t = post.t.trim();
  if(post.t.length<3)throw 'title too short. write something would you?'

  var newtid;
  var forum;

  //check existence
  return queryfunc.doc_load(fid,'forums')
  .catch(err=>{
    throw 'specified forum not found'
  })
  .then(function(gotforum){
    //the forum object
    forum = gotforum;

    //obtain new tid
    return apifunc.get_new_tid()
  })
  .then((gottid)=>{
    newtid = gottid;
    //now we got brand new tid.

    //construct a new thread
    var timestamp = Date.now();
    var newthread =
    {
      _key:newtid.toString(),//key must be string.
      fid:fid.toString(),
    };

    //save this new thread
    return queryfunc.doc_save(newthread,'threads')
  })
  .then((result)=>{
    return postToThread(post,result._key,user);
  })
}

var postToPost = function(post,pid,user){ //modification.
  var timestamp,newpost={},original_key,tid;

  return queryfunc.doc_load(pid,'posts')
  .catch(err=>{
    throw 'target post does not exist.'
  })
  .then(original_post=>{
    original_key = original_post._key
    tid = original_post.tid

    timestamp = Date.now();

    newpost.tlm = timestamp
    newpost.c = post.c
    newpost.t = post.t
    newpost.l = post.l

    //modification to the original
    original_post.pid = original_key;
    original_post._key = undefined;

    //now save original to history;
    return queryfunc.doc_save(original_post,'histories')
  })
  .then((back)=>{
    //now update the existing with the newly created:
    return queryfunc.doc_update(original_key,'posts',newpost);
  })
  .then(result=>{
    //update thread as needed.
    return update_thread(tid)
    .then(updateresult=>{
      result.tid = tid;
      result.redirect = '/thread/' + tid +'?post=' + result._key
      return result;
    })
  })
}

table.postTo = {
  operation:function(params){
    //0. object extraction
    var user = params.user
    var post = params.post

    //1. validation
    validation.validatePost(post);

    //2. target extraction
    var target = params.target.split('/')
    if(target.length!=2)throw 'Bad target format, expect "targetType/targetKey"'
    var targetType = target[0]; var targetKey = target[1];

    //3. switch according to targetType
    switch (targetType) {
      case 'forum':
      return postToForum(post,targetKey,user) //throws if notexist
      case 'thread':
      return postToThread(post,targetKey,user)
      case 'post':
      return postToPost(post,targetKey,user)
      default:
      throw 'target type not implemented'
    }
  },
  requiredParams:{
    target:String,
    post:Object,
  },
  testPermission:function(params){


  }
}

table.getPost = {
  operation:params=>{
    var pid = params.pid

    return AQL(`
      let p = document(posts,@pid)
      return p
      `,
      {
        pid,
      }
    )
    .then(result=>{
      return result[0]
    })
  },
  requiredParams:{
    pid:String,
  }
}

table.updateAllThreads = {
  operation:function(params){
    return update_all_threads()
  }
}

table.updateAllForums = {
  operation:function(params){
    return updateAllForums()
  }
}

function updateForum(fid){
  return AQL(`
    let forum = document(forums,@fid)

    let postcount = (
      for t in threads
      filter t.fid == forum._key
      return t.count
    )

    let count_posts = sum(postcount)
    let count_threads = length(postcount)

    let count_posts_today = sum(
      for t in threads
      filter t.fid == forum._key && t.tlm > DATE_NOW()-86400*1000
      return t.count_today
    )

    update forum with {count_posts,count_posts_today,count_threads} in forums
    return NEW
    `,
    {
      fid,
    }
  )
  .then(result=>{return result[0]})
}

function updateAllForums(){
  return AQL(`
    for forum in forums

    let postcount = (
      for t in threads
      filter t.fid == forum._key
      return t.count
    )

    let count_posts = sum(postcount)
    let count_threads = length(postcount)

    let count_posts_today = sum(
      for t in threads
      filter t.fid == forum._key && t.tlm > DATE_NOW()-86400*1000
      return t.count_today
    )

    update forum with {count_posts,count_posts_today,count_threads} in forums
    `
  )
}


//在对thread或者post作操作之后，更新thread的部分属性以确保其反应真实情况。
update_thread = (tid)=>{
  var aqlobj={
    query:`
    FOR t IN threads
    FILTER t._key == @tid //specify a thread

    let oc =(
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc asc //sort by creation time, ascending
      limit 0,1 //get first
      return p
    )[0]
    let lm = (
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc desc //sort by creation time, descending
      limit 0,1 //get first
      return p
    )[0]
    let count = (
      for p in posts
      filter p.tid == t._key
      COLLECT WITH COUNT INTO k
      return k
    )[0]
    let count_today = (
      for p in posts
      filter p.tid == t._key && p.toc > DATE_NOW()-86400*1000
      COLLECT WITH COUNT INTO k
      return k
    )[0]
    UPDATE t WITH {toc:oc.toc,tlm:lm.tlm,lm,oc,count,count_today} IN threads
    `
    ,
    params:{
      tid,
    },
  };
  return aqlall(aqlobj);
};

//!!!danger!!! will make the database very busy.
update_all_threads = ()=>{
  return AQL(`
    FOR t IN threads

    let oc =(
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc asc //sort by creation time, ascending
      limit 0,1 //get first
      return p
    )[0]
    let lm = (
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc desc //sort by creation time, descending
      limit 0,1 //get first
      return p
    )[0]
    let count = (
      for p in posts
      filter p.tid == t._key
      COLLECT WITH COUNT INTO k
      return k
    )[0]
    let count_today = (
      for p in posts
      filter p.tid == t._key && p.toc > DATE_NOW()-86400*1000
      COLLECT WITH COUNT INTO k
      return k
    )[0]
    UPDATE t WITH {toc:oc.toc,tlm:lm.tlm,lm,oc,count,count_today} IN threads
    `
  )
};

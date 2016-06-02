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

var permissions = require('permissions')

var table = {};
module.exports = table;

//post to a given thread.
var postToThread = function(params,tid,user){
  var post = params.post
  var tobject = null

  //check existence
  return queryfunc.doc_load(tid,'threads')
  .catch((err)=>{
    throw 'target thread not found'
  })
  .then((th)=>{
    //th is the thread object now
    tobject = th
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
      ipoc:params._req.iptrim,
    };

    //insert the new post into posts collection
    return queryfunc.doc_save(newpost,'posts')
  })
  .then(saveResult=>{
    var pid = saveResult._key
    //update thread object to make sync
    var updatedThread = null

    return update_thread(tid)
    .then(t=>{
      updatedThread = t
      return incrementForumOnNewPost(tid)
    })
    .then(r=>{
      saveResult.fid = tobject.fid
      saveResult.tid = tid;
      saveResult.pid = pid
      saveResult.redirect = '/thread/' + tid

      if(updatedThread.count){
        var total = updatedThread.count
        var page = Math.floor(total/30)
        if(page){
          saveResult.redirect += '?page=' + page.toString()
        }
      }
      saveResult.redirect+= '#' + pid

      return saveResult;
    })
    //okay to respond the user
  })
};

var postToForum = function(params,fid,user){
  var post = params.post

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
    return incrementForumOnNewThread(newtid)
  })
  .then((result)=>{
    return postToThread(params,newtid,user)
  })
}

var postToPost = function(params,pid,user){ //modification.
  var post = params.post

  var timestamp,newpost={},original_key,tid;

  return queryfunc.doc_load(pid,'posts')
  .catch(err=>{
    throw 'target post does not exist.'
  })
  .then(original_post=>{
    original_key = original_post._key
    tid = original_post.tid
    author = original_post.uid
    toc = original_post.toc

    permissions.testModifyTimeLimit(params,author===user._key,toc)

    timestamp = Date.now();

    newpost.tlm = timestamp
    newpost.c = post.c
    newpost.t = post.t
    newpost.l = post.l

    newpost.uidlm = params.user._key
    newpost.iplm = params._req.iptrim

    //update only the necessary ones

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
    .then(updatedThread=>{
      result.fid = updatedThread.fid
      result.pid = pid;
      result.tid = tid;
      result.redirect = '/thread/' + tid +'?post=' + result._key
      return result;
    })
  })
}

table.postTo = {
  init:function(){
    return queryfunc.createIndex('posts',{
      fields:['tid','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
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
    return Promise.resolve()
    .then(()=>{
      switch (targetType) {
        case 'forum':
        return postToForum(params,targetKey,user) //throws if notexist
        case 'thread':
        return postToThread(params,targetKey,user)
        case 'post':
        return postToPost(params,targetKey,user)
        default:
        throw 'target type not implemented'
      }
    })
    .then(result=>{
      var parr=[]
      if(result.pid){
        parr.push(updatePost(result.pid))
      }

      if(result.fid){
        //parr.push(updateForum(result.fid))
      }

      return Promise.all(parr).then(()=>{
        return result
      })
    })
  },
  requiredParams:{
    target:String,
    post:Object,
  },
  testPermission:function(params){


  }
}

table.getPost = {
  operation:function(params){
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
  init:function(){
    queryfunc.createIndex('posts',{
      fields:['tid','toc'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
    queryfunc.createIndex('posts',{
      fields:['tid','tlm'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:function(params){
    return AQL(`
      for p in posts
      collect tid = p.tid with COUNT into pcount

      let thread = document(threads,tid)
      filter thread!=null

      let oc = (for p in posts filter p.tid==tid sort p.toc asc limit 1 return p)[0]
      let lm = (for p in posts filter p.tid==tid sort p.tlm desc limit 1 return p)[0]
      let count = pcount

      let count_today = (
        for p in posts
        filter p.tid==tid && p.toc > DATE_NOW()-86400*1000
        COLLECT WITH COUNT INTO k
        return k
      )[0]

      update thread with {
        count,
        count_today,
        oc:oc._key,
        lm:lm._key,
        toc:oc.toc,
        tlm:lm.toc,
        uid:oc.uid
      } in threads
      `
    )
  }
}

table.updateAllForums = {
  init:function(){
    queryfunc.createIndex('threads',{
      fields:['fid','tlm','disabled'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })

    queryfunc.createIndex('threads',{
      fields:['disabled'],
      type:'hash',
      unique:'false',
      sparse:'false',
    })
  },
  operation:function(params){
    return AQL(`
      for t in threads
      filter t.disabled==null
      collect fid = t.fid aggregate count_posts = sum(t.count), count_threads = length(t)

      let forum = document(forums,fid)
      filter forum!=null

      let count_posts_today = sum(
        for t in threads
        filter t.fid==fid && t.tlm > DATE_NOW()-86400*1000
        return t.count_today
      )

      update forum with {count_posts,count_posts_today,count_threads} in forums
      `
    )
  }
}

table.updateAllUsers = {
  init:function(){
    queryfunc.createIndex('posts',{
      fields:['uid'],
      type:'hash',
      unique:'false',
      sparse:'false',
    })
  },
  operation:function(params){
    return AQL(`
      for p in posts
      collect uid = p.uid with count into count_posts

      let user = document(users,uid)
      filter user!=null

      let count_threads = (
        for t in threads
        filter t.uid == uid
        collect with count into ct
        return ct
      )[0]

      update user with {count_posts,count_threads} in users
      `
    )
  }
}

function updatePost(pid){
  return queryfunc.doc_load(pid,'posts')
  .then(post=>{
    var content = post.c
    var resources_declared = content.match(/\{r=[0-9]{1,20}}/g) //extract resource identifier(s) from content
    if(!resources_declared)return

    for(i in resources_declared){ //extract resource key
      resources_declared[i] = resources_declared[i].replace(/\{r=([0-9]{1,20})}/,'$1')
    }

    // update post object with resource keys
    return AQL(`
      let post = document(posts,@pid)
      update post with {r:unique(@rd)} in posts
      `,
      {
        pid,
        rd:resources_declared,
      }
    )
  })
}

function incrementForumOnNewThread(tid){
  return AQL(`
    let t = document(threads,@tid)
    filter t.fid!=null
    let f = document(forums,t.fid)

    UPDATE f WITH {
      count_threads:f.count_threads+1
    } IN forums
    RETURN NEW
    `,
    {
      tid
    }
  )
  .then(res=>{
    report('incrementForumOnNewThread')
    return res[0]
  })
}

function incrementForumOnNewPost(tid){
  return AQL(`
    let t = document(threads,@tid)
    filter t.fid!=null
    let f = document(forums,t.fid)

    UPDATE f WITH {
      count_posts_today:f.count_posts_today+1,
      count_posts:f.count_posts+1
    } IN forums
    RETURN NEW
    `,
    {
      tid
    }
  )
  .then(res=>{
    report('incrementForumOnNewPost')
    return res[0]
  })
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
  .then(result=>{
    report('forum updated')
    report(result[0])
    return result[0]
  })
}

function updateAllForums(){

}


//在对thread或者post作操作之后，更新thread的部分属性以确保其反应真实情况。
update_thread = (tid)=>{
  return AQL(`
    //specify a thread
    let t = document(threads,@tid)

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

    UPDATE t WITH {toc:oc.toc,tlm:lm.toc,lm:lm._key,oc:oc._key,uid:oc.uid,count,count_today} IN threads
    return NEW
    `
    ,
    {
      tid,
    }
  ).then(result=>{
    report('thread updated')
    report(result[0])
    return result[0]
  })
};

//!!!danger!!! will make the database very busy.
update_all_threads = ()=>{

};

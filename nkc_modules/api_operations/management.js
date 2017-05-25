

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('../server_settings.js');
var helper_mod = require('../helper.js')();
var queryfunc = require('../query_functions')
var AQL = queryfunc.AQL

var layer = require('../layer')

var table = {};
module.exports = table;

table.moveThread = {
  operation:function(params){
    //check if fid exists
    var po = params.permittedOperations

    var fid = params.fid
    var tid = params.tid
    var cid = params.cid

    var thread = new layer.Thread(tid)
    var destforum = new layer.Forum(fid)
    var origforum

    return thread.load()
    .then(thread=>{
      if(thread.model.tid) {
        origforum = new layer.Forum(thread.model.fid)
        return origforum.load()
          .then(origforum => {
            return origforum.inheritPropertyFromParent()
          })
          .then(origforum => {
            if (po['moveAllThreads']) {
              return
            }
            //else we have to check: do you own the original forum?
            return origforum.testModerator(params.user.username)
          })
      }
      return
    })
    .then(()=>{
      return destforum.load()
    })
    .then(destforum=>{
      //test existence
      return thread.update({fid,cid})
    })
    .then(()=>`successfully moved ${tid} to ${fid}`)
  },
  requiredParams:{
    tid:String,
    fid:String,
  },
  testPermission:function(params){
    //get original fid of given tid, and check if user is moderator to fid.
    //if(getThread(params.tid).owner.indexOf(params.user)<0) return Promise.reject('you cant move that')

    return 0;
  },
}

table.disablePost = {
  operation:function(params){
    var pid = params.pid
    var post = new layer.Post(pid)
    var po = params.permittedOperations

    return post.load()
    .then(post=>{
      return post.loadForum()
    })
    .then(origforum=>{
      if(po['toggleAllPosts']){
        return
      }
      let thread = new layer.Thread(post.model.tid);
      thread.load().then(t => thread.model = t);
      let model = thread.model;
      if(!model.fid && model.toMid === params.user._key || !model.fid && !model.toMid && model.mid === params.user._key) {
        return
      }
      //else we have to check: do you own the original forum?
      return origforum.testModerator(params.user.username)
    })
    .then(()=>{
      return post.update({disabled:true})
      .then(post=>{
        var op = require('../api_operations.js')
        return op.table.updateThread.operation({tid:post.model.tid})
        .then(()=>{
          return 'success'
        })
      })
    })
  },
  requiredParams:{
    pid:String,
  },
  testPermission:function(params){
    return 0;
  },
}

table.enablePost = {
  operation:function(params){
    var pid = params.pid
    var post = new layer.Post(pid)
    var po = params.permittedOperations

    return post.load()
    .then(post=>{
      return post.loadForum()
    })
    .then(origforum=>{
      if(po['toggleAllPosts']){
        return
      }
      //else we have to check: do you own the original forum?
      return origforum.testModerator(params.user.username)
    })
    .then(()=>{
      return post.update({disabled:null})
    })
      .then(post => {
        var op = require('../api_operations.js');
        return op.table.updateThread.operation({tid: post.model.tid})
      })
  },
  requiredParams:{
    pid:String,
  },
  testPermission:function(params){
    return 0;
  },
}

table.addThreadToCart={
  operation:function(params){
    var uid = params.user._key
    var tid = params.tid.toString()
    return AQL(`
      let u = document(users,@uid)
      update u with { cart:SLICE(UNIQUE(PUSH(u.cart,@cid)),-30) } in users
      `,{
        uid:uid,
        cid:'threads/'+tid,
      }
    )
  },
  requiredParams:{
    tid:String,
  }
}

table.addPostToCart={
  operation:function(params){
    var uid = params.user._key
    var pid = params.pid.toString()
    return AQL(`
      let u = document(users,@uid)
      update u with { cart:SLICE(UNIQUE(PUSH(u.cart,@cid)),-30) } in users
      `,{
        uid:uid,
        cid:'posts/'+pid,
      }
    )
  },
  requiredParams:{
    pid:String,
  }
}

table.listCart={
  operation:function(params){
    var cart = params.user.cart?params.user.cart:[];
    return AQL(
      `
      for i in @cart
      let c = document(i)
      filter c != null
      let oc = document(posts,c.oc)
      return merge(c,{oc})
      `
      ,{
        cart,
      }
    )
  },
}

table.clearCart={
  operation:function(params){
    var uid = params.user._key
    return queryfunc.doc_update(uid,'users',{cart:[]})
  }
}

table.setDigest={
  operation:function(params){
    let forum;
    var tid = params.tid
    var thread = new layer.Thread(tid)
    var po = params.permittedOperations

    return thread.load()
    .then(thread=>{
      return thread.loadForum()
    })
    .then(origforum=>{
      forum = origforum;
      if(po['toggleDigestAllThreads']){
        return
      }

      //else we have to check: do you own the original forum?
      return origforum.testModerator(params.user.username)
    })
    .then(()=>{
      return thread.update({digest:thread.model.digest?null:true})
    })
    .then(() => queryfunc.setDigestHook(forum.model._key, thread.model.digest))
    .then(()=>{
      return {message:thread.model.digest?'设为精华':'撤销精华'}
    })
  },
  requiredParams:{
    tid:String,
  }
}

table.setTopped={
  operation:function(params){
    var tid = params.tid
    var thread = new layer.Thread(tid)
    var po = params.permittedOperations

    return thread.load()
    .then(thread=>{
      return thread.loadForum()
    })
    .then(origforum=>{
      if(po['toggleToppedAllThreads']){
        return
      }

      //else we have to check: do you own the original forum?
      return origforum.testModerator(params.user.username)
    })
    .then(()=>{
      return thread.update({topped:thread.model.topped?null:true})
    })
    .then(()=>{
      return {message:thread.model.topped?'设为置顶':'撤销置顶'}
    })
  },
  requiredParams:{
    tid:String,
  }
}

table.pullNewPosts24h = {
  operation:function(params){
    return AQL(`for p in posts
      filter p.toc> date_now()-86400000
      sort p.toc desc
      return p`
    )
  }
}

table.unbanUser = {
  operation:function(params) {
    var u = new layer.User(params.uid)
    return u.load()
    .then(u=>{
      var certs = (u.model.certs||[])

      certs = certs.filter(c=>c!='banned')

      return u.update({certs})
    })
    .then(u=>{
      return 'success'
    })
  },
  requiredParams:{
    uid:String,
  }
}

table.banUser = {
  operation:function(params){
    var u = new layer.User(params.uid)
    return u.load()
    .then(u=>{
      var certs = (u.model.certs||[])

      if(
        certs.indexOf('moderator')>=0||
        certs.indexOf('editor')>=0||
        certs.indexOf('dev')>=0||
        certs.indexOf('scholar')>=0||

        u.model.xsf>0
      ){
        throw '为什么？你为何要封禁此用户？你是怎么了？'
      }

      if(certs.indexOf('banned')>=0){
        throw '这人被封过了吧。。。'
      }

      certs = certs.concat(['banned'])

      return u.update({certs})
    })
    .then(u=>{
      return 'success'
    })
  },
  requiredParams:{
    uid:String,
  }
}

table.addCredit = {
  operation:function(params){
    //0. extract params
    var q = Number(params.q)
    if(q>10000 ||q<-10000){
      throw 'invalid q value'
    }

    var type = params.type
    var pid = params.pid

    var reason = params.reason
    if(reason.length<2)throw '写太短啦'

    if(typeof(reason)!='string')throw 'bad reason'

    //1. tell type

    switch (type) {
      case 'xsf':
      case 'kcb':
      break;

      default:
      throw 'credit type not recognized'
    }

    //3. give to targetuser
    return AQL(`
      let p = document(posts,@pid)
      let u = document(users,p.uid)
      update u with {@type:(@q+u.@type)} in users
      return NEW
      `,{pid,type,q}
    )
    .then(arr=>{
      var touid = arr[0]._key;

      //2. make new
      var cl = new layer.BaseDao('creditlogs')
      return cl.save({
        pid,
        type,
        q,
        uid:params.user._key,
        username:params.user.username,
        touid,
        reason,
        source:'nkc',
        toc:Date.now(),
      })
      .then(cl=>{
        var operations = require('../api_operations.js')
        return operations.table.updatePost.operation(params)
      })
      .then(()=>{
        return arr[0]
      })
    })
  },
  requiredParams:{
    pid:String,
    reason:String,
    type:String,
    q:Number,
  }
};

table.forumVisibilitySwitch = {
  operation: params => {
    var forum = new layer.Forum(params.fid);
    return forum.visibilitySwitch()
      .then(res => {
        return res._result[0];
      });
  }
};

table.forumIsVisibleForNCCSwitch = {
  operation: params => {
    var forum = new layer.Forum(params.fid);
    return forum.isVisibleForNCCSwitch()
      .then(res => res._result[0]);
  }
};



var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('../server_settings.js');
var helper_mod = require('../helper.js')();
var queryfunc = require('../query_functions')
var validation = require('../validation')
var AQL = queryfunc.AQL
var apifunc = require('../api_functions')
var layer = require('../layer')
var permissions = require('../permissions')
let operations = require('../api_operations');
const db = queryfunc.getDB();
const aql = queryfunc.getAql();
const contentLength = require('../tools').contentLength;

var table = {};
module.exports = table;

function createReplyRelation(frompid,topid){
  var operations = require('../api_operations.js')
  report('create reply relation '+frompid+' to '+topid)
  return operations.table.createReplyRelation.operation({frompid,topid})
}

var incrementPsnl = function(key){
  var psnl = new layer.Personal(key)
  return psnl.load()
    .then(psnl=>{
      return psnl.update({new_message:(psnl.model.new_message||0)+1})
    })
}

//post to a given thread.
var postToThread = function(params,tid,user, type){
  let pid;
  var post = params.post
  var tobject = null
  let timestamp = Date.now();
  //check existence
  return queryfunc.doc_load(tid,'threads')
  .then((th)=>{
    //th is the thread object now
    tobject = th
    //apply for a new pid
    return apifunc.get_new_pid();
  })
  .then((newpid) => {
    //create a new post
    pid = newpid;
    let content = post.c;
    let existUsers = [];
    const matchedArray = content.match(/@([^@\s]*)\s/g); //match @someone
    if(matchedArray) {
      let promises = matchedArray.map(str => {
        const userName = str.slice(1, -1); //slice the @ and [\s] in reg
        return apifunc.get_user_by_name(userName)
          .then(u => {
            let foundUser = u[0];
            let flag = true; //true means user did not in existUser[]
            for(let u of existUsers) {
              if(u.username === foundUser.username) flag = false;
            }
            if(foundUser && flag) {
              existUsers.push({username: foundUser.username, uid: foundUser._key});
            }
          })
      });
      return Promise.all(promises)
        .then(() => Promise.all(existUsers.map(foundUser => db.collection('invites').save({
          pid,
          invitee: foundUser.uid,
          inviter: user._key,
          toc: timestamp
        })
          .then(() => incrementPsnl(foundUser.uid)))))
        .then(() => {
          const newpost = { //accept only listed attribute
            _key:newpid,
            tid,
            toc:timestamp,
            tlm:timestamp,
            c:content,
            t:post.t,
            l:post.l,
            uid:user._key,
            username:user.username,
            ipoc:params._req.iptrim,
            atUsers: existUsers
          };
          return queryfunc.doc_save(newpost,'posts')
        })
    }
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
    /*return postToMine({
      tid: tid,
      pid: newpid,
      time: timestamp,
      fid: tobject.fid,
      uid: user._key,
    }, type)
      .then(() =>*/
    return queryfunc.doc_save(newpost,'posts')
    //insert the new post into posts collection
  })
  .then(saveResult=> {
    pid = saveResult._key
    //update thread object to make sync
    var updatedThread = null

    //extract quotation if exists
    var found = post.c.match(/\[quote=(.*?),(.*?)]/)
    if (found && found[2]) {
      apifunc.get_user_by_name(found[1]).then(users => {
        var ptuser = users[0];
        if (ptuser._key !== tobject.uid) {
          report(found)
          createReplyRelation(pid, found[2])
        }
      });
    }
    return userBehaviorRec({
      pid,
      tid,
      mid: tobject.mid,
      toMid: tobject.toMid,
      uid: user._key,
      fid: tobject.fid,
      time: timestamp,
      type: type
    })
    .then(()=>{
      if(user._key==tobject.uid){
        //if the reply was to oneself
        return
      }else{

        var tc = new layer.Thread(tid)
        return tc.load()
        .then(tc=>{
          return tc.mergeOc()
        })
        .then(tc=>{
          return createReplyRelation(pid,tc.model.oc._key)
        })
      }
    })
    .then(()=>{
      return update_thread(tid)
    })
    .then(t=>{
      updatedThread = t
      return incrementForumOnNewPost(tid)
    })
    .then(r=>{
      saveResult.fid = tobject.fid
      saveResult.tid = tid;
      saveResult.pid = pid
      saveResult.redirect = '/t/' + tid

      if(updatedThread.count){
        var total = updatedThread.count
        var page = Math.floor((total-1)/settings.paging.perpage)
        if(page){
          saveResult.redirect += '?page=' + page.toString()
        }
      }
      saveResult.redirect+= '#' + pid;
      return saveResult;
    })

    //okay to respond the user
  })
};



var postToForum = function(params,fid,user,cat){
  var post = params.post
  if(typeof post.t !=='string')throw '请填写标题！'

  post.t = post.t.trim();
  if(post.t.length<3)throw '标题太短啦！'

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
      uid:user._key,
      fid:fid.toString(),
      category:cat,
      cid:cat,
      mid: user._key,
    };

    //save this new thread
    return queryfunc.doc_save(newthread,'threads')
  })
  .then(() => queryfunc.threadsCount(fid))
  .then((result)=>{
    return incrementForumOnNewThread(newtid)
  })
  .then((result)=>{
    return postToThread(params,newtid,user, 1)
  })
    .catch(e => console.log(e))
};

var postToPost = function(params,pid,user){ //modification.
  var post = params.post
  var fid;
  var timestamp,newpost={},original_key,tid;
  let origthread;
  let content = post.c;
  let originPost;
  return queryfunc.doc_load(pid,'posts')
  .catch(err=>{
    throw 'target post does not exist.'
  })
  .then(original_post=>{
    originPost = original_post;
    original_key = original_post._key
    tid = original_post.tid
    author = original_post.uid
    toc = original_post.toc

    permissions.testModifyTimeLimit(params,author===user._key,toc)
    //params, isSelf, timeofcreation

    //test to see if he owns the forum
    origthread = new layer.Thread(tid)
    return origthread.load()
    .then(origthread=>{
      if(origthread.model.fid) {
        return new layer.Forum(origthread.model.fid).load()
      }
      return db.query(aql`
        LET pf1 = DOCUMENT(personalForums, ${origthread.model.toMid || null})
        LET pf2 = DOCUMENT(personalForums, ${origthread.model.mid})
        RETURN UNION(pf1.moderators, pf2.moderators)
      `)
        .then(cursor => cursor.all())
        .then(moderators => ({
          testModerator: username => {
            if(moderators.includes(username)) {
              return
            }
            throw `权限不足`
          }
        }))
    })
    .then(origforum=>{
      if(origforum.model) {
        fid = origforum.model._key;
        return origforum.inheritPropertyFromParent()
      }
      return origforum
    })
    .then(origforum=>{
      if(params.permittedOperations['editAllThreads']){
        return
      }

      if(author===user._key){ //self modification is not limited!
        return
      }

      //else we have to check: do you own the original forum?
      return origforum.testModerator(params.user._key)
    })
    .then(()=> {
      timestamp = Date.now();

      newpost.tlm = timestamp
      newpost.c = post.c
      newpost.t = post.t
      newpost.l = post.l

      newpost.uidlm = params.user._key
      newpost.iplm = params._req.iptrim
      /*postToMine({
        time: timestamp,
        uid: original_post.uid,
        tid: original_post.tid,
        pid: original_post._key,
        fid: fid
      }, 3);*/

      //update only the necessary ones

      //modification to the original
      original_post.pid = original_key;
      original_post._key = undefined;

      let existUsers = [];
      const matchedArray = content.match(/@([^@\s]*)\s/g); //match @someone
      const usersAlreadyInformed = originPost.atUsers || [];
      if (matchedArray) {
        let promises = matchedArray.map(str => {
          const userName = str.slice(1, -1); //slice the @ and [\s] in reg
          if (!(usersAlreadyInformed.find(obj => obj.username === userName))) {
            return apifunc.get_user_by_name(userName)
              .then(u => {
                let foundUser = u[0];
                let flag = true;
                for(let u of existUsers) {
                  if(u.username === foundUser.username) flag = false;
                }
                if (foundUser && flag) {
                  existUsers.push({username: foundUser.username, uid: foundUser._key});
                }
              })
          }
        });
        return Promise.all(promises)
          .then(() => Promise.all(existUsers.map(foundUser => db.collection('invites').save({
            pid,
            invitee: foundUser.uid,
            toc: timestamp,
            inviter: user._key
          })
            .then(() => incrementPsnl(foundUser.uid)))))
          .then(() => {
            for (let atUser of usersAlreadyInformed) {
              const username = '@' + atUser.username + ' ';
              if (matchedArray.find(obj => obj === username)) {
                existUsers.push(atUser);
              }
            }
          })
          .then(() => newpost.atUsers = existUsers)
      }
    })
      .then(() => queryfunc.doc_save(original_post,'histories'))
  })
  .then(()=> {
    let obj = {
      pid: original_key,
      tid,
      mid: origthread.model.mid,
      toMid: origthread.model.toMid,
      fid: origthread.model.fid,
      type: 3,
      uid: newpost.uidlm,
      time: newpost.tlm
    };
    return userBehaviorRec(obj)
  })
    .then(() => {
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
      result.redirect = '/t/' + tid

      //

      if(updatedThread.count){
        var total = updatedThread.count
        var page = Math.floor((total-1)/settings.paging.perpage)
        if(page){
          result.redirect += '?page=' + page.toString()
        }
      }
      result.redirect+= '#' + pid

      //

    })
    .then(() => result)
  })
}

table.postTo = {
  init:function() {
    return Promise.all([
      queryfunc.createIndex('posts', {
        fields: ['tid', 'toc'],
        type: 'skiplist',
        unique: 'false',
        sparse: 'false',
      }),
      queryfunc.createIndex('invites', {
        fields: ['pid'],
        type: 'skiplist',
      }),
      queryfunc.createIndex('invites', {
        fields: ['invited'],
        type: 'skiplist'
      })
    ])
  },
  operation:function(params){
    //0. object extraction
    var user = params.user
    var post = params.post
    var cat = post.cat
    //1. validation
    validation.validatePost(post);
    if(!params.permittedOperations['postTo']) {
      throw `权限错误`
    }

    //2. target extraction
    var targets = params.target.split(',');
    for(target of targets) {
      target = target.split('/');
      if(target.length!=2)throw 'Bad target format, expect "targetType/targetKey"'
      var targetType = target[0]; var targetKey = target[1];
      //console.log(target)
      //console.log(params);
      //3. switch according to targetType
      return Promise.resolve()
        .then(()=>{
          switch (targetType) {
            case 'f':
              return postToForum(params,targetKey,user,cat) //throws if notexist
            case 't':
              return postToThread(params,targetKey,user,2)
            case 'post':
              return postToPost(params,targetKey,user)
            case 'm':
              return postToPersonalForum(params,targetKey)
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

table.updateAllPostsFromCreditLog = {
  init:function(){
    queryfunc.createIndex('creditlogs',{
      fields:['pid'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },

  operation:function(params){
    return AQL(`
      for c in creditlogs
      collect pid = c.pid into g = c

      let p = document(posts,pid)
      filter p!=null

      let sorted = (
        for c in g
        sort g.toc asc
        return c
      )

      update p with {credits:sorted} in posts
      `
    )
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

      let t = thread

      let oc = (for p in posts filter p.tid==tid sort p.toc asc limit 1 return p)[0]
      let lm = (for p in posts filter p.tid==tid && !p.disabled sort p.toc desc limit 1 return p)[0]
      let count = pcount

      let count_remain = ( //remaining, ignoring the disabled
        for p in posts
        filter p.tid == t._key && !p.disabled
        COLLECT WITH COUNT INTO k
        return k
      )[0]


      let count_today = (
        for p in posts
        filter p.tid==tid && p.toc > DATE_NOW()-86400*1000
        COLLECT WITH COUNT INTO k
        return k
      )[0]

      let iarr = (
        filter oc.r
        for r in oc.r
        let res = document(resources,r)
        filter position(['jpg','png','svg','jpeg'],res.ext,false)
        return true
      )

      let has_image = length(iarr)?true:null
      let has_file = (length(oc.r) - length(iarr))?true:null

      update thread with {
        count,
        count_remain,
        count_today,
        oc:oc._key,
        lm:lm._key,
        toc:oc.toc,
        tlm:lm.toc,
        uid:oc.uid,
        has_image,
        has_file
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
      .then(() => {
        return AQL(`
          FOR f IN forums
            FILTER f.type == 'forum'
            LET normal = (FOR t IN threads
              FILTER t.disabled == null && t.fid == f._key
              COLLECT WITH COUNT INTO length
              RETURN length)[0]
            LET digest = (FOR t IN threads
              FILTER t.disabled == null && t.digest == true && t.fid == f._key
              COLLECT WITH COUNT INTO length
              RETURN length)[0]
            UPDATE f WITH {tCount: {digest, normal}} IN forums
        `)
      })
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
    if(!resources_declared)resources_declared=[]

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
    .then(()=>{
      return AQL(`
        let p = document(posts,@pid)
        let sorted = (
          for c in creditlogs
          filter c.pid == @pid
          sort c.toc asc
          return c
        )

        update p with {credits:length(sorted)?sorted:null} in posts
        `,{pid}
      )
    })
  })
}

table.updatePost = {
  operation:function(params){
    return updatePost(params.pid)
  }
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

table.updateThread = {
  init:()=>{
    queryfunc.createIndex('posts',{
      fields:['tid','disabled'],
      type:'skiplist',
      unique:'false',
      sparse:'false',
    })
  },
  operation:function(params) {
    return update_thread(params.tid)
  }
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
      FILTER p.tid == t._key && !p.disabled//all post of that thread
      sort p.toc desc //sort by creation time, descending
      limit 0,1 //get first
      return p
    )[0]
    let count = (
      for p in posts
      filter p.tid == t._key //&& !p.disabled
      COLLECT WITH COUNT INTO k
      return k
    )[0]
    let count_remain = ( //remaining, ignoring the disabled
      for p in posts
      filter p.tid == t._key && !p.disabled
      COLLECT WITH COUNT INTO k
      return k
    )[0]
    let count_today = (
      for p in posts
      filter p.tid == t._key && p.toc > DATE_NOW()-86400*1000
      COLLECT WITH COUNT INTO k
      return k
    )[0]

    let iarr = (
      filter oc.r
      for r in oc.r
      let res = document(resources,r)
      filter position(['jpg','png','svg','jpeg'],res.ext,false)
      return true
    )

    let has_image = length(iarr)?true:null
    let has_file = ((oc.r?length(oc.r):0) - length(iarr))?true:null

    UPDATE t WITH {toc:oc.toc,tlm:lm.toc,lm:lm._key,oc:oc._key,uid:oc.uid,count,count_today,count_remain,has_image,has_file} IN threads
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

let userBehaviorRec = obj => {
  return queryfunc.doc_save(obj, 'usersBehavior')
}

let postToPersonalForum = (params, targetKey) => {
  targetKey = targetKey.toString();
  let user = params.user;
  let post = params.post;

  if (typeof post.t !== 'string')throw '请填写标题！'

  post.t = post.t.trim();
  if (post.t.length < 3)throw '标题太短啦！'

  let newtid;

  //check
  return queryfunc.doc_load(targetKey, 'users')
    .then(() => apifunc.get_new_tid())
    .then(gottid => {
      newtid = gottid;
      //now we got brand new tid.

      //construct a new thread
      let newthread =
        {
          _key: newtid.toString(),//key must be string.
          uid: user._key,
          mid: user._key,
        };
      if(user._key !== targetKey) {
        newthread.toMid = targetKey
      }
      global.personalThreadsCount.normal ++; //count ++
      //save this new thread
      return queryfunc.doc_save(newthread, 'threads')
    })
    .then(() => postToThread(params, newtid, user, 1))
    .catch(e => console.log(e))
};

// let checkInviteUser = (params) => {
//   let found = content.match(/@ (.*?) /);
//   if(found[0]) {
//     return apifunc.get_user_by_name(found[1])
//       .then(users => {
//         if(users.length) {
//           let user = users[0];
//           return operations.table.inviteUser.operation({
//             frompid: })
//         }
//         return params
//       })
//   }
//   return params
// }

table.configPersonalForum = {
  operation: params => {
    const user = params.user;
    const description = params.description.trim();
    const forumName = params.forumName.trim();
    const announcement = params.announcement.trim();
    const moderators = params.moderators.map(moderator => moderator.trim());
    let moderatorArr = []; //now moderators are stored in _key, not name
    const key = params.key;
    if(contentLength(forumName) > 20) throw '专栏名称不能大于20个字节(ASCII)';
    if(contentLength(announcement) > 1000) throw '公告内容不能大于1000字节(ASCII)';
    if(contentLength(description) > 60) throw '专栏介绍不能大于60字节(ASCII)';
    return db.collection('personalForums').document(key)
      .then(pf => {
        const originalModerators = pf.moderators;
        if(originalModerators.indexOf(user._key) === -1) throw '权限错误';
        return Promise.all(moderators.map(moderator => db.query(aql`
          FOR u IN users
            FILTER u.username == ${moderator}
            RETURN u
        `)
          .then(cursor => cursor.all())
          .then(users => {
            if(users.length === 0) throw '副版主含有不存在的用户名'
            moderatorArr.push(users[0]._key)
          })))
      })
      .then(() => db.query(aql`
        LET arr1 = (FOR o IN personalForums
          FILTER o.display_name == ${forumName} && o._key != ${key}
          RETURN o.display_name)
        LET arr2 = (FOR o IN forums
          FILTER o.display_name == ${forumName} && o._key != ${key}
          RETURN o.display_name)
        RETURN UNION(arr1, arr2)
      `))
      .then(cursor => cursor.all())
      .then(arr => {
        if(arr[0].length > 0) throw `专栏名称与现有的学院或个人专栏名称重复,不能使用`;
        return db.query(aql`
          LET doc = DOCUMENT(personalForums, ${key})
          UPDATE doc WITH {
            description: ${description},
            display_name: ${forumName},
            announcement: ${announcement},
            moderators: APPEND([${key}], ${moderatorArr}, true)
          } IN personalForums
          RETURN NEW
        `)
      })
      .then(cursor => cursor.all())
      .then(f => f)
  }
};

//!!!danger!!! will make the database very busy.
update_all_threads = () => {
};

table.getForumsList = {
  operation: params => {
    if(!params.user) throw `未登录用户不能发帖`;
    let uid = params.user._key;
    return db.collection('users').document(uid)
      .then(user => permissions.getContentClassesByCerts(user.certs))
      .then(contentClasses => db.query(aql`
        LET classes = PUSH(UNIQUE(${contentClasses}), null)
        FOR f in forums
          FILTER POSITION(classes, f.class) && f._key != 'recycle'
          COLLECT parent = f.parentid INTO group = f
          RETURN {
            parent,
            group
          }
          /*COLLECT class = f.class INTO group = f
          RETURN {
            class,
            group
          }*/
      `))
      .then(res => {
        return {
          forumsList: res._result,
          uid
        }
      })
      .catch(e => {throw e})
  }
};

table.switchTInPersonalForum = {
  operation: params => {
    const user = params.user;
    const uid = user._key;
    const tid = params.tid;
    const type = params.type;
    let thread;
    let myForum;
    let othersForum;
    if(!type) return db.query(aql`
      LET pf = DOCUMENT(personalForums, ${uid})
      RETURN pf.toppedThreads
    `)
      .then(cursor => cursor.next())
      .then(toppedThreads => {
        const threads = toppedThreads || [];
        const index = threads.findIndex(element => element === tid);
        if(index > -1) {
          threads.splice(index, 1);
          return db.collection('personalForums').update(uid, {toppedThreads: threads})
            .then(() => db.collection('threads').document(tid))
            .then(thread => {
              const toppedUsers = thread.toppedUsers || [];
              const index = toppedUsers.findIndex(element => element === uid);
              if(index > -1) {
                toppedUsers.splice(index, 1);
                return db.collection('threads').update(tid, {toppedUsers})
              }
            })
        }
        threads.push(tid);
        return db.collection('personalForums').update(uid, {toppedThreads: threads})
          .then(() => db.collection('threads').document(tid))
          .then(thread => {
            const toppedUsers = thread.toppedUsers || [];
            toppedUsers.push(uid);
            return db.collection('threads').update(tid, {toppedUsers})
          })
      })
      .catch(e => {
        throw e
      });
    if(type === 'MF') return db.collection('threads').document(tid)
      .then(t => {
        thread = t;
        return db.collection('personalForums').document(thread.mid)
      })
      .then(mf => {
        myForum = mf;
        if(myForum.moderators.indexOf(user._key) > -1) {
          const threads = myForum.toppedThreads || [];
          const index = threads.findIndex(element => element === tid);
          if(index > -1) {
            threads.splice(index, 1);
            return db
              .collection('personalForums')
              .update(myForum, {toppedThreads: threads});
          }
          else {
            threads.push(tid);
            return db.collection('personalForums')
              .update(myForum, {toppedThreads: threads})
          }
        }
        throw '权限不足'
      })
      .then(() => {
        const toppedUsers = thread.toppedUsers || [];
        const index = toppedUsers.findIndex(u => u === myForum._key);
        if(index > -1) {
          toppedUsers.splice(index, 1);
          return db
            .collection('threads')
            .update(thread, {toppedUsers: toppedUsers});
        }
        else {
          toppedUsers.push(myForum._key);
          return db.collection('threads')
            .update(thread, {toppedUsers})
        }
      });
    if(type === 'OF') return db.collection('threads').document(tid)
      .then(t => {
        thread = t;
        if(!thread.toMid) throw '发生异常' + tid;
        return db.collection('personalForums').document(thread.toMid)
      })
      .then(oF => {
        othersForum = oF;
        if(othersForum.moderators.indexOf(user._key) > -1) {
          const threads = othersForum.toppedThreads || [];
          const index = threads.findIndex(t => t === tid);
          if(index > -1) {
            threads.splice(index, 1);
            return db
              .collection('personalForums')
              .update(othersForum, {toppedThreads: threads});
          }
          else {
            threads.push(tid);
            return db.collection('personalForums')
              .update(othersForum, {toppedThreads: threads})
          }
        }
        throw '权限不足'
      })
      .then(() => {
        const users = thread.toppedUsers ||[];
        const index = users.findIndex(u => u === othersForum._key);
        if(index > -1) {
          users.splice(index, 1);
          return db
            .collection('threads')
            .update(thread, {toppedUsers: users});
        }
        else {
          users.push(othersForum._key);
          return db.collection('threads')
            .update(thread, {toppedUsers: users})
        }
      });
    throw '发生异常' + tid
  }
};
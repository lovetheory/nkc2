//query functions
//equivalent ORM-Layer

var colors = require('colors');
var moment = require('moment');
const privateSettings = require('./private_settings');
var settings = require('./server_settings.js');
var helper_mod = require('./helper.js')();
var bodyParser = require('body-parser');
const arango = require('arangojs');
const db = arango(privateSettings.arango);

var users = db.collection('users');

var express = require('express');
var api = express.Router();

var validation = require('./validation');

const aql = arango.aql;

var queryfunc = {};

queryfunc.db_init = function(){
  let p = [];
  var colArr = [
    'posts',
    'threads',
    'forums',
    'logs',
    'users',
    'users_personal',
    'counters',
    'resources',
    'questions',
    'answersheets',
    'histories',
    'sms',
    'collections',
    'replies',
    'mobilelogs',
    'mobilecodes',
    'threadtypes',
    'mailcodes',
    'invites',
    'personalForums',
    'usersSubscribe',
    'usersBehavior',
    'activeusers',
    'settings',
    'behaviorLogs',
    'usersLoggedToday'
  ];
  return db.listCollections()
    .then(collections => {
      let flag = true;
      for(let colName of colArr) {
        flag = true;
        for(let index in collections) {
          if(colName === collections[index].name) {
            flag = false;
          }
        }
        if(flag) {
          console.log('creating collection ' + colName);
          Promise.resolve(db.collection(colName).create().catch(e => console.log(e)))
        }
      }
    })
    .catch(e => console.log(e,'error occurs here'))
//create every collection, if not existent
}


function createIndex(coll,details){
  var def = {
    type:'skiplist',
    unique:false,
    sparse:false,
  }
  Object.assign(def,details)
  return db.collection(coll).createIndex(def)
  .then(res=>{
    report(`index ${def.fields} created on ${coll}`)
  })
}

queryfunc.createIndex = createIndex;

queryfunc.allNecessaryIndexes = ()=>{


  return Promise.all([
    createIndex('threads',{fields:['fid','toc']}),
    createIndex('threads',{fields:['tlm']}),
    createIndex('threads',{fields:['fid','tlm'],sparse:false}),
    //createIndex('posts',{fields:['tid','toc']}),
    //createIndex('posts',{fields:['tid','tlm']}),
    createIndex('posts',{fields:['tid'],type:'hash'}),
    //createIndex('posts',{fields:['tid']}),
  ])
}

queryfunc.addCertToUser = function(uid,cert){
  return AQL(
    `
    let u = document(users,@uid)
    update u with {certs:UNIQUE(PUSH(u.certs,@cert))}
    in users
    `,{
      uid,
      cert,
    }
  )
}

queryfunc.createCollection = collection_name=>{
  return db.collection(collection_name).create()
}

queryfunc.dropCollection = collection_name=>{
  return db.collection(collection_name).drop()
}

queryfunc.importCollection = (docarray,collname)=>{
  return db.collection(collname).import(docarray)
}

/*
AQL Object
query: String
the AQL string.
params: Object
carries the values for fields within query.
*/

function aqlall(aqlobj){
  return db.query(aqlobj.query,aqlobj.params) //returns a Promise
  .then(cursor=>{
    return cursor.all();
  })
};

var AQL = function(querystring,parameter){
  if(!parameter)parameter = {}
  return aqlall({query:querystring,params:parameter});
}

queryfunc.AQL = AQL

queryfunc.incr_counter = function(countername){
  return AQL(`
    FOR c IN counters
    FILTER c._key == @countername
    UPDATE c WITH {count:c.count+1} IN counters
    RETURN NEW.count
    `,{'countername':countername}
  )
  .then(vals=>{
    if(vals.length==1){
      return vals[0].toString()
    }
    throw ('counter '+countername.toString()+' may not be available')
  })
};

//standardrize the result retrieved from Arangodb
queryfunc.result_reform = (result)=>{
  return {
    'id' : result._key,
  };
};

queryfunc.doc_save = (doc,collection_name)=>{
  return db.collection(collection_name).save(doc)
};

queryfunc.doc_load = (doc_key,collection_name)=>{
  return db.collection(collection_name).document(doc_key)
};

queryfunc.doc_update = (doc_key,collection_name,props)=>{
  return db.collection(collection_name).update(doc_key,props)
};

queryfunc.doc_replace = (doc,coll_name)=>{
  return db.collection(coll_name).replace(doc,doc);
}

queryfunc.doc_kill = (doc_key,collection_name)=>{
  return db.collection(collection_name).remove(doc_key)
};

queryfunc.doc_list_all = (opt)=>{
  if(!opt.start)opt.start=0;
  if(!opt.count)opt.count=100;
  opt.start=Number(opt.start);
  opt.count=Number(opt.count);

  var aqlobj = {
    query:`
    for i in ${opt.type}
    limit @start, @count
    return i
    `
    ,
    params:{
      start:opt.start,
      count:opt.count,
    },
  };

  return aqlall(aqlobj);
};

queryfunc.doc_list_all_questions = function(opt){
  var aqlobj = {
    query:`
    for i in questions
    sort i.toc desc
    limit 0, 1000
    return i
    `
    ,
    params:{
    },
  };

  return aqlall(aqlobj);
}

queryfunc.doc_list_certain_questions = function(qlist){
  var aqlobj = {
    query:
    `
    for i in @qlist
    for q in questions
    filter q._key == i
    return q
    `
    ,
    params:{
      qlist:qlist,
    },
  }

  return aqlall(aqlobj);
}

queryfunc.doc_answersheet_from_ip = function(ipstr){
  var aqlobj = {
    query:
    `
    for a in answersheets
    filter a.ip == @ipstr
    sort a.tsm desc
    return a
    `
    ,
    params:{
      ipstr:ipstr,
    },
  }

  return aqlall(aqlobj);
}

queryfunc.doc_list = (opt)=>{
  if(!opt.start)opt.start=0;
  if(!opt.count)opt.count=100;
  opt.start=Number(opt.start);
  opt.count=Number(opt.count);

  var aqlobj={
    query:`
    FOR c IN ${opt.type}
    FILTER c.${opt.filter_by} == @equals
    sort c.${opt.sort_by} ${opt.order}
    limit @start, @count
    return c
    `
    ,
    params:{
      equals:opt.equals,
      start:opt.start,
      count:opt.count,
    },
  };

  return aqlall(aqlobj);
};

queryfunc.doc_list_join = (opt)=>{
  if(!opt.start)opt.start=0;
  if(!opt.count)opt.count=100;

  var aqlobj={
    query:`
    FOR c IN ${opt.type}
    FILTER c.${opt.filter_by} == @equals
    sort c.${opt.sort_by} ${opt.order}
    limit ${opt.start}, ${opt.count}
    FOR p IN ${opt.join_collection}
    FILTER p.${opt.join_filter_by} == c.${opt.join_equals_attrib}
    return merge(c,{${opt.join_equals_attrib}:p})
    `
    ,
    params:{
      'equals':opt.equals,
    },
  };

  return aqlall(aqlobj);
};

//custom join function
queryfunc.ftp_join = (opt)=>{
  if(!opt.start)opt.start=0;
  if(!opt.count)opt.count=100;

  var aqlobj={
    query:`
    FOR t IN @type
    FILTER t.@filter_by == @equals
    sort t.${opt.sort_by} ${opt.order}
    limit ${opt.start}, ${opt.count}
    let j0 =(
      FOR p IN posts
      FILTER p._key == t.lm
      return p
    )
    let j1 = (
      FOR p IN posts
      FILTER p._key == t.oc
      return p
    )
    return merge(t,{lm:j0[0]},{oc:j1[0]})
    `
    ,
    params:{
      equals:opt.equals,
      type:opt.type,
      filter_by:opt.filter_by,
    },
  };
  return aqlall(aqlobj);
};

/**
 * @description: returns a list of all threads, filter & sort by params
 * @param: (Object)params, (Object)paging
 * @e.g.: queryfunc.getIndexThreads(params, paging)
 * @return: ...
 * @author: lzszone 03-17-2017
* */
queryfunc.getForumThreads = (params, paging) => {
  var contentClasses = {};
  for(var param in params.contentClasses) {
    if(params.contentClasses[param] == true) {
      contentClasses[param] = true;
    }
  }
  return db.query(aql`
    FOR t IN threads
      SORT t.${params.sortby? 'toc' : 'tlm'} DESC
      FILTER t.${params.digest? 'digest' : 'disabled'}==${params.digest? true : null}
      LET forum = DOCUMENT(forums, t.fid)
      FILTER (HAS(${contentClasses}, forum.class) || forum.isVisibleForNCC == true) &&
      forum.visibility == true
      LIMIT ${paging.start}, ${paging.count}
      LET oc = DOCUMENT(posts, t.oc)
      LET ocuser = DOCUMENT(users, oc.uid)
      LET lm = DOCUMENT(posts, t.lm)
      LET lmuser = DOCUMENT(users, lm.uid)
      RETURN MERGE(t, {oc, lm, forum, ocuser, lmuser})
 `).catch(e => report(e));
};

queryfunc.getActiveUsers = () => {
  return db.query(aql`
    FOR u IN activeusers
      SORT u.vitality DESC
      LIMIT 12
      LET username = DOCUMENT(users, u.uid).username
      RETURN MERGE(u, {username})
  `)
}

queryfunc.getForumList = contentClasses => {
  return db.query(aql`
    LET cForums = (FOR f IN forums
      FILTER f.type == 'category' && HAS(${contentClasses}, f.class)
      RETURN f)
    FOR cForum IN cForums
      LET children = (FOR f IN forums
        FILTER f.parentid == cForum._key && HAS(${contentClasses}, f.class)
        RETURN f)
      RETURN MERGE(cForum, {children})
  `)
};

queryfunc.getIndexForumList = contentClasses => {
  return db.query(aql`
    LET cForums = (FOR f IN forums
      FILTER f.type == 'category' && f.visibility == true && (HAS(${contentClasses}, f.class) || f.isVisibleForNCC == true)
      SORT f.order
      RETURN f)
    FOR cForum IN cForums
      LET children = (FOR f IN forums
        FILTER f.parentid == cForum._key && f.visibility == true && (HAS(${contentClasses}, f.class) || f.isVisibleForNCC == true)
        SORT f.order
        RETURN f)
      RETURN MERGE(cForum, {children})
  `)
};

queryfunc.threadsCount = function(fid) {
  return db.query(aql`
    LET f = DOCUMENT(forums, ${fid})
    LET normal = f.tCount.normal + 1
    LET digest = f.tCount.digest
    UPDATE f WITH {
      tCount:{
        normal,
        digest
      }
    } IN forums
  `)
};

queryfunc.setDigestHook = function(fid, digest) {
  let dig = digest || false;
  return db.query(aql`
    LET f = DOCUMENT(forums, ${fid})
    UPDATE f WITH {
      tCount:{
        ${digest? 'digest' : 'normal'}: f.tCount.${digest? 'digest' : 'normal'} - 1,
        ${digest? 'normal' : 'digest'}: f.tCount.${digest? 'normal' : 'digest'} + 1
      }
    } IN forums
  `)
};

queryfunc.getVisibleChildForums = function(params) {
  return db.query(aql`
    FOR f IN forums
      FILTER f.type == 'forum' && HAS(${params.contentClasses}, f.class)
      RETURN f._key
  `)
    .then(res => res._result)
};

queryfunc.getDB = function() {
  return db;
};

queryfunc.getAql = function() {
  return aql;
};

queryfunc.rebuildActiveUsers = () => {
  let userList = [];
  return db.query(aql`
  LET timeStamp = DATE_NOW() - 6048000000
  LET postUserList = (FOR p IN posts
    SORT p.tlm DESC
    FILTER p.tlm > timeStamp && p.disabled == null
    COLLECT uid = p.uid INTO group = p
    LET user = DOCUMENT(users, uid)
    FILTER !POSITION(user.certs, 'banned')
    RETURN {
      uid,
      lWPostCount: LENGTH(group),
      lWThreadCount: 0,
      xsf: DOCUMENT(users, uid).xsf
    })
  LET threadUserList = (FOR t IN threads
    SORT t.tlm DESC
    FILTER t.oc > timeStamp && t.disabled == null
    COLLECT uid = t.uid INTO group = t
    LET user = DOCUMENT(users, uid)
    FILTER !POSITION(user.certs, 'banned')
    RETURN {
      uid,
      lWThreadCount: LENGTH(group),
      lWPostCount: 0,
      xsf: DOCUMENT(users, uid).xsf
    })
  RETURN {
    threadUserList,
    postUserList
  }
`)
    .then(cursor => cursor.next())
    .then(obj => {
      console.log(obj);
      let threadUserList = obj.threadUserList;
      let postUserList = obj.postUserList;
      userList.concat(threadUserList);
      for (let postUser of postUserList) {
        let flag = true;
        for (let user of userList) {
          if (user.uid === postUser.uid) {
            user.lWPostCount = postUser.lWPostCount - user.lWThreadCount; //posting a post when creating a thread,
            flag = false;
            break;
          }
        }
        if(flag) userList.push(postUser);
      }
      for (let user of userList) {
        user.vitality = settings.user.vitalityArithmetic(user.lWThreadCount, user.lWPostCount, user.xsf);
        delete user.xsf
      }
      userList.sort((a, b) => b.vitality - a.vitality);
      userList = userList.slice(0, 12);
      return db.collection('activeusers').truncate()
    })
    .then(() => db.collection('activeusers').import(userList))
    .then(result => `\n刷新了活跃用户集合, 有${result.created}条数据被创建`)
};

queryfunc.getUsersThreads = uid => db.query(aql`
  FOR t IN threads
    SORT t.tlm DESC
    FILTER t.uid == ${uid} && t.fid != 'recycle'
    LET lm = DOCUMENT(posts, t.lm)
    LET forum = DOCUMENT(forums, t.fid)
    LET lmuser = DOCUMENT(users, lm.uid)
    LET oc = DOCUMENT(posts, t.oc)
    LET ocuser = DOCUMENT(users, oc.uid)
    LIMIT 8
    RETURN MERGE(t, {lm, forum, oc, ocuser, lmuser})
`)
  .then(cursor => cursor.all());

queryfunc.incrementPsnl = function(key, type){
  return db.collection('users_personal').document(key)
    .then(psnl=>{
      const newMessage = psnl.new_message;
      newMessage[type] = (newMessage[type] || 0) + 1;
      return db.collection('users_personal').update(key, {new_message: newMessage})
    })
};

module.exports = queryfunc;

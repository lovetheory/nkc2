//query functions
//equivalent ORM-Layer
module.paths.push('./nkc_modules'); //enable require-ment for this path
var colors = require('colors');
var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');

var db = require('arangojs')(settings.arango);

var users = db.collection('users');

var express = require('express');
var api = express.Router();

var validation = require('validation');

let aql = require('arangojs').aql;

var queryfunc = {};

queryfunc.db_init = function(){
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
  ];
  db.listCollections()
    .then(collections => {
      for(var colName of colArr) {
        for(var index in collections) {
          if(colName === collections[index].name) {
            return
          }
        }
        return db.collection(colName).create()
      }
    })
    .catch(e => console.log(e))
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
queryfunc.getIndexThreads = (params, paging) => {
  var contentClasses = {};
  for(var param in params.contentClasses) {
    if(params.contentClasses[param] == true) {
      contentClasses[param] = true;
    }
  }
  if(params.sortby){// aql sucks: it seem that aql didn't treat the string template as a string,
    return db.query(aql`
    FOR t IN threads
      SORT t.disabled DESC, t.toc DESC
      FILTER t.disabled==null && t.${params.digest? 'digest' : 'disabled'}==${params.digest? true : null}
      LET forum = DOCUMENT(forums, t.fid)
      FILTER (HAS(${contentClasses}, forum.class) || forum.isVisibleForNCC == true) && forum.visibility == true
      LIMIT ${paging.start}, ${paging.count}
      LET oc = DOCUMENT(posts, t.oc)
      LET ocuser = DOCUMENT(users, oc.uid)
      LET lm = DOCUMENT(posts, t.lm)
      LET lmuser = DOCUMENT(users, lm.uid)
      RETURN MERGE(t, {oc, lm, forum, ocuser, lmuser})
   `).catch(e => report(e));
  }
  else{
    return db.query(aql`
    FOR t IN threads
      SORT t.disabled DESC, t.tlm DESC
      FILTER t.disabled==null && t.${params.digest? 'digest' : 'disabled'}==${params.digest? true : null}
      LET forum = DOCUMENT(forums, t.fid)
      FILTER (HAS(${contentClasses}, forum.class) || forum.isVisibleForNCC == true) && forum.visibility == true
      LIMIT ${paging.start}, ${paging.count}
      LET oc = DOCUMENT(posts, t.oc)
      LET ocuser = DOCUMENT(users, oc.uid)
      LET lm = DOCUMENT(posts, t.lm)
      LET lmuser = DOCUMENT(users, lm.uid)
      RETURN MERGE(t, {oc, lm, forum, ocuser, lmuser})
   `).catch(e => report(e));
  }
};

queryfunc.computeActiveUser = (triggerUser) => {
  var lWThreadUsers = [];
  var lWPostUsers = [];
  var activeUL = [];
  var user = {};
  return db.listCollections()
    .then(collections => {
      for (var index in collections) {
        if (collections[index].name === 'activeusers') {
          console.log('goes here');
          return db.query(aql`
            LET lWThreadCount = (
              FOR t IN threads
                FILTER t.toc > ${Date.now() - 604800000} && t.disabled == NULL
                && t.fid != 'recycle' && t.uid == ${triggerUser._key}
                COLLECT WITH COUNT INTO length
                RETURN length)[0]
            LET lWPostCount = (
              FOR p IN posts
              LET t = DOCUMENT(threads, p.tid)
                FILTER p.tlm > ${Date.now() - 604800000} && t.fid != 'recycle'
                && p.uid == ${triggerUser._key} && p.disabled == NULL
                COLLECT WITH COUNT INTO length
                RETURN length)
            LET xsf = DOCUMENT(users, ${triggerUser._key}).xsf
            RETURN {
              xsf,
              uid: ${triggerUser._key},
              lWThreadCount,
              lWPostCount
            }
          `)
            .then(res => {
              user = res._result[0];
              user.lWPostCount = user.lWPostCount - user.lWThreadCount;    //creating a post when creating a thread by default
              user.vitality = settings.user.vitalityArithmetic(user.lWThreadCount, user.lWPostCount, user.xsf);
              delete user.xsf;
              return user
            })
            .then(user => db.query(aql`
              FOR u IN activeusers
                FILTER u.uid == ${user.uid}
                UPDATE u WITH {
                  lWThreadCount: ${user.lWThreadCount},
                  lWPostCount: ${user.lWPostCount},
                  vitality: ${user.vitality}
                } IN activeusers
                RETURN NEW
            `))
            .then(res => {
              if(res._result.length) {
                return
              }
              return db.query(aql`
                FOR u IN activeusers
                  SORT u.vitality
                  LIMIT 1
                  UPDATE u WITH {
                    lWThreadCount: ${user.lWThreadCount},
                    lWPostCount: ${user.lWPostCount},
                    vitality: ${user.vitality},
                    uid: ${user.uid}
                  } IN activeusers
              `)
            })
            .catch(e => console.log(e))
        }
      }
      return db.collection('activeusers').create()
        .then(() => {
          db.query(aql`
            FOR t IN threads
              FILTER t.toc > ${Date.now() - 604800000} && t.fid != 'recycle'
              && t.disabled == NULL
              LET lWThreadCount = 0
              LET lWPostCount = 0
              LET user = DOCUMENT(users, t.uid)
              LET certs = user.certs
              FILTER !POSITION(certs, 'banned')
              LET xsf = user.xsf
              RETURN {uid: t.uid, lWThreadCount: lWThreadCount, lWPostCount: lWPostCount, xsf: xsf}
          `)
            .then(res => {
              lWThreadUsers = res._result;
              return db.query(aql`
                FOR p IN posts
                  LET t = DOCUMENT(threads, p.tid)
                  FILTER p.tlm > ${Date.now() - 604800000} && t.fid != 'recycle'
                  && p.disabled == NULL
                  LET lWThreadCount = 0
                  LET lWPostCount = 0
                  LET user = DOCUMENT(users, p.uid)
                  LET certs = user.certs
                  FILTER !POSITION(certs, 'banned')
                  LET xsf = user.xsf
                  RETURN {uid: p.uid, lWThreadCount: lWThreadCount, lWPostCount: lWPostCount, xsf: xsf}
              `)
            })  //6048000000 = 1week
            .then(res => {   //merge user array
              lWPostUsers = res._result;
              for (var oUser of lWThreadUsers) { //original
                var flag = true;
                for (var nUser of activeUL) { //new
                  if (nUser.uid === oUser.uid) {
                    nUser.lWThreadCount += 1;
                    flag = false;
                    break;
                  }
                }
                if (flag) {
                  oUser.lWThreadCount = 1;
                  activeUL.push(oUser);
                }
              }
              for (var oUser of lWPostUsers) { //original
                var flag = true;
                for (var nUser of activeUL) { //new
                  if (nUser.uid === oUser.uid) {
                    nUser.lWPostCount += 1;
                    flag = false;
                    break;
                  }
                }
                if (flag) {
                  oUser.lWPostCount = 1;
                  activeUL.push(oUser);
                }
              }
              for (var user of activeUL) {
                user.lWPostCount = user.lWPostCount - user.lWThreadCount;    //creating a post when creating a thread by default
                user.vitality = settings.user.vitalityArithmetic(user.lWThreadCount, user.lWPostCount, user.xsf);
                delete user.xsf;
              }
              activeUL.sort((a, b) => {
                return b.vitality - a.vitality;
              });
              activeUL = activeUL.slice(0, 12);
            })
            .then(() => {
              for (var user of activeUL) {
                db.collection('activeusers').save(user)
                  .catch(e => console.log('error occurred'.red + e))
              }
            })
            .then(() => queryfunc.createIndex('activeusers',{
                fields:['vitality'],
                type:'skiplist',
                unique:'false',
                sparse:'false',
              })
            )
            .catch((e) => console.log(e))
        })
    })
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

module.exports = queryfunc;

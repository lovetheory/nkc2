//query functions
//equivalent ORM-Layer
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');

var db = require('arangojs')(settings.arango.address);
db.useDatabase(settings.server.database_name);

var users = db.collection('users');

var express = require('express');
var api = express.Router();

var validation = require('validation');

let aql = require('arangojs').aql;

var queryfunc = {};

queryfunc.db_init = function(){
  ['posts',
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
  'activeusers'
].map(function(collection_name){db.collection(collection_name).create()});
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
 *  @description: returns a count of a collection
 *  @param: (String)colName, (String)filter: attribute of querying doc
 *  @e.g.: queryfunc.docCount('threads', 'cid == "149"')
 *  @return: (Number)length: length of querying collection
 *  @author: lzszone 03-13-2017
 * */

queryfunc.docCount = (colName, filterObj) => {
  var filterObj = filterObj || {};
  var filters = '';
  if(!colName) throw 'colName should not be undefined';
  if(JSON.stringify(filterObj)==='{}');
  else{
    filters = 'FILTER ';
    for(var filter in filterObj) {
      filters += `t.${filter} == ${String(filterObj[filter])} && `;
    }
    filters = filters.substring(0, filters.length - 4);
  }
  return db.query(aql`
    FOR doc IN ${colName}
      ${filters == '' ? '' : 'FILTER ' + filters}
      COLLECT WITH COUNT INTO length
      RETURN length
  `).catch(e => report(e))
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
  for(param in params.contentClasses) {
    if(params.contentClasses[param] == true) {
      contentClasses[param] = true;
    }
  }
  if(params.sortby){// aql sucks: it seem that aql didn't treat the string template as a string,
    return db.query(aql`
    FOR t IN threads
      SORT t.disabled DESC, t.toc DESC
      FILTER t.disabled==null && t.digest==${params.digest? true : null}
      LET forum = DOCUMENT(forums, t.fid)
      FILTER HAS(${contentClasses}, forum.class)
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
      FILTER t.disabled==null && t.digest==${params.digest? true : null}
      LET forum = DOCUMENT(forums, t.fid)
      FILTER HAS(${contentClasses}, forum.class)
      LIMIT ${paging.start}, ${paging.count}
      LET oc = DOCUMENT(posts, t.oc)
      LET ocuser = DOCUMENT(users, oc.uid)
      LET lm = DOCUMENT(posts, t.lm)
      LET lmuser = DOCUMENT(users, lm.uid)
      RETURN MERGE(t, {oc, lm, forum, ocuser, lmuser})
   `).catch(e => report(e));
  }
};

/**
 *
 *     unfilished!!!!
 *
 * */

queryfunc.getPostsFromDB = (filterObj, limitObj, sortArr) => {
  var filterObj = filterObj || {};
  var limitObj = limitObj || {};
  var sortArr = sortArr || [];
  var filters = '';
  var sorters = '';
  if(JSON.stringify(filterObj)==='{}');
  else{
    filters = 'FILTER ';
    for(var filter in filterObj) {
      if(filter === 'contentClasses') {
        filters += `HAS(${filterObj[filter].toString()}, TO_STRING(class)) && `
      }
      else{
        filters += `t.${filter} == ${String(filterObj[filter])} &&`;
      }
    }
    filters = filters.substring(0, filters.length-4);
  }
  limitObj.start = limitObj.start ? Number(limitObj.start) : 0;
  limitObj.count = limitObj.count ? Number(limitObj.count) : 100;
  if(JSON.stringify(sortArr)==='[]');
  else{
    sorters = 'SORT ';
    for(var sort in sortArr) {
      sorters += 't.' + sort + ' desc && ';
    }
    sorters = sorters.substring(0, sorters.length-4);
  }
  return db.query(aql`
    FOR t IN threads
      LET forum = DOCUMENT(forums, t.fid)
      LET forumName = forum.display_name
      LET class = forum.class
      LET postName = DOCUMENT(posts, t.oc)
      LET postContent = DOCUMENT(posts, )
      ${filters == '' ? '' : + filters}
      LIMIT ${limitObj.start} ${limitObj.count}
      ${sorters == '' ? '' : sorters}
      
`)
};

queryfunc.getForumList = () => {
  return db.query(aql`
    FOR f IN forums
      FILTER f.type=='category'
      RETURN f
  `)
};

queryfunc.computeActiveUser = () => {
  var lWThreadUsers = [];  //last week thread users
  var lWPostUsers = [];  //post users
  var activeUL = [];  //active user list
  db.query(aql`
      FOR t IN threads
        FILTER t.toc > ${Date.now() - 604800000} && t.disabled == NULL
        LET lWThreadCount = 0
        LET lWPostCount = 0
        LET xsf = DOCUMENT(users, t.uid).xsf
        RETURN {'uid': t.uid, lWThreadCount, lWPostCount, xsf}
    `)
    .then(res => {
      lWThreadUsers = res._result;
      return db.query(aql`
        FOR p IN posts
          FILTER p.tlm > ${Date.now() - 604800000}
          LET lWThreadCount = 0
          LET lWPostCount = 0
          LET xsf = DOCUMENT(users, p.uid).xsf
          RETURN {'uid': p.uid, lWThreadCount, lWPostCount, xsf})
      `)
    })  //6048000000 = 1week
    .then(res => {
      lWPostUsers = res._result;
      for(var oUser in lWThreadUsers) { //original
        var flag = true;
        for(var nUser in activeUL) { //new
          if(activeUL[nUser].uid === lWThreadUsers[oUser].uid) {
            activeUL[nUser].lWThreadCount += 1;
            flag = false;
            break;
          }
        }
        if(flag) {
          lWThreadUsers[oUser].lWThreadCount = 1;
          activeUL.push(lWThreadUsers[oUser]);
        }
      }
      for(var oUser in lWPostUsers) { //original
        var flag = true;
        for(var nUser in activeUL) { //new
          if(activeUL[nUser].uid === lWPostUsers[oUser].uid) {
            activeUL[nUser].lWPostCount += 1;
            flag = false;
            break;
          }
        }
        if(flag) {
          lWPostUsers[oUser].lWPostCount = 1;
          activeUL.push(lWPostUsers[oUser]);
        }
      }
      activeUL.sort((a, b) => {
        return (a.xsf + a.lWThreadCount*3 + a.lWPostCount) - (b.xsf + b.lWThreadCount*3 + b.lWPostCount)
      });
      activeUL = activeUL.slice(0,16);
      return db.listCollections();
    })
    .then(collections => {
      if(collections.indexOf('activeusers')){
        return db.collection('activeusers').drop();
      }
    })
    .then(() => {
      return db.collection('activeusers').create()
    })
    .then(() => {
      for(var user in activeUL) {
        db.collection('activeusers').save(activeUL[user]).catch(e => console.log(e))
      }
    })
    .catch((e) => console.log(e));
};

queryfunc.getActiveUsers = () => {
  return db.query(aql`
    FOR u IN activeusers
      SORT u.vitality
      LIMIT 10
      RETURN u
  `)
};

module.exports = queryfunc;

//query functions
//equivalent ORM-Layer
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');

var db = require('arangojs')(settings.arango.address);
db.useDatabase('nkc');
var users = db.collection('users');

var express = require('express');
var api = express.Router();

var validation = require('validation');

var queryfunc = {};

queryfunc.db_init = function(callback){
  ['posts',
  'threads',
  'forums',
  'logs',
  'users',
  'counters',
  'resources',
  'questions',
  'answersheets',
  'histories',
  ].map(function(collection_name){db.collection(collection_name).create()});
  //create every collection, if not existent
}

/*
AQL Object
  query: String
    the AQL string.
  params: Object
    carries the values for fields within query.
*/

function aqlall(aqlobj,callback){
  if(arguments.length===1){
    return db.query(aqlobj.query,aqlobj.params) //returns a Promise
  }

  db.query(aqlobj.query,aqlobj.params)
  .then((cursor)=>{
    return cursor.all();
  })
  .then((result_array)=>{
    callback(null,result_array);
  })
  .catch((err)=>{
    callback(err);
  })
};


queryfunc.incr_counter = function(countername,callback){
  var aqlobj = {
    query:`
    FOR c IN counters
    FILTER c._key == @countername
    UPDATE c WITH {count:c.count+1} IN counters
    RETURN NEW.count
    `,
    params:{
      'countername':countername
    },
  };

  aqlall(aqlobj,(err,vals)=>{
    if(err)callback(err);else {
      if(vals.length==1){
        callback(null,vals[0].toString());
      } else {
        callback('counter '+countername.toString()+' may not be available');
      }
    }
  });
};

//standardrize the result retrieved from Arangodb
queryfunc.result_reform = (result)=>{
  return {
    'id' : result._key,
  };
};

queryfunc.doc_save = (doc,collection_name,callback)=>{
  db.collection(collection_name).save(doc,callback);
};

queryfunc.doc_load = (doc_key,collection_name,callback)=>{
  db.collection(collection_name).document(doc_key,callback);
};

queryfunc.doc_update = (doc_key,collection_name,props,callback)=>{
  db.collection(collection_name).update(doc_key,props).then(
    body=>{
      callback(null,body);
    },
    err=>{
      callback(err);
    }
  );
};

queryfunc.doc_kill = (doc_key,collection_name,callback)=>{
  db.collection(collection_name).remove(doc_key,callback);
};

queryfunc.doc_list_all = (opt,callback)=>{
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

  aqlall(aqlobj,callback);
};

queryfunc.doc_list_all_questions = function(opt,callback){
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

  aqlall(aqlobj,callback);
}

queryfunc.doc_list_certain_questions = function(qlist,callback){
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

  aqlall(aqlobj,callback);
}

queryfunc.doc_answersheet_from_ip = function(ipstr,callback){
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

  aqlall(aqlobj,callback);
}

queryfunc.doc_list = (opt,callback)=>{
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

  aqlall(aqlobj,callback);
};

queryfunc.doc_list_join = (opt,callback)=>{
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

  aqlall(aqlobj,callback);
};

//custom join function
queryfunc.ftp_join = (opt,callback)=>{
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
  aqlall(aqlobj,callback);
};

//在对thread或者post作操作之后，更新thread的部分属性以确保其反应真实情况。
queryfunc.update_thread = (tid,callback)=>{
  var aqlobj={
    query:`
    FOR t IN threads
    FILTER t._key == @equals //specify a thread

    let oc =(
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc asc //sort by creation time, ascending
      limit 0,1 //get first
      return p
    )
    let lm = (
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc desc //sort by creation time, descending
      limit 0,1 //get first
      return p
    )
    UPDATE t WITH {lm:lm[0],oc:oc[0]} IN threads
    `
    ,
    params:{
      'equals':tid,
    },
  };
  aqlall(aqlobj,callback);
  console.log('mmmmm');
};

//!!!danger!!! will make the database very busy.
queryfunc.update_all_threads = (callback)=>{
  var aqlobj={
    query:`
    FOR t IN threads

    let oc =(
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc asc //sort by creation time, ascending
      limit 0,1 //get first
      return p
    )
    let lm = (
      FOR p IN posts
      FILTER p.tid == t._key //all post of that thread
      sort p.toc desc //sort by creation time, descending
      limit 0,1 //get first
      return p
    )
    UPDATE t WITH {lm:lm[0],oc:oc[0]} IN threads
    `
    ,
    params:{
    },
  };
  aqlall(aqlobj,callback);
};

module.exports = queryfunc;

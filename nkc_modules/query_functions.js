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

  return aqlall(aqlobj)
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

module.exports = queryfunc;

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

function aqlall(aqlobj,callback){
  db.query(aqlobj.query,aqlobj.params)
  .then
  (
    cursor => {
      // cursor is a cursor for the query result
      cursor.all()
      .then(
        vals => { //the array
          callback(null,vals);
        },
        err => {
          callback(err); //unlikely to happen
        }
      );
    },
    err => {
      callback(err);
    }
  );
};

exports.incr_counter = function(countername,callback){
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
exports.result_reform = (result)=>{
  return {
    'id' : result._key,
  };
};

exports.doc_save = (doc,collection_name,callback)=>{
  db.collection(collection_name).save(doc,callback);
};

exports.doc_load = (doc_key,collection_name,callback)=>{
  db.collection(collection_name).document(doc_key,callback);
};

exports.doc_update = (doc,collection_name,props,callback)=>{
  db.collection(collection_name).update(doc,props).then(
    body=>{
      callback(null,body);
    },
    err=>{
      callback(err);
    }
  );
};

exports.doc_list = (opt,callback)=>{
  if(!opt.start)opt.start=0;
  if(!opt.count)opt.count=100;

  var aqlobj={
    query:`
    FOR c IN ${opt.type}
    FILTER c.${opt.filter_by} == @equals
    sort c.${opt.sort_by} ${opt.order}
    limit ${opt.start}, ${opt.count}
    return c
    `
    ,
    params:{
      'equals':opt.equals,
    },
  };

  aqlall(aqlobj,callback);
};

exports.doc_list_join = (opt,callback)=>{
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
exports.ftp_join = (opt,callback)=>{
  if(!opt.start)opt.start=0;
  if(!opt.count)opt.count=100;

  var aqlobj={
    query:`
    FOR t IN ${opt.type}
    FILTER t.${opt.filter_by} == @equals
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
      'equals':opt.equals,
    },
  };
  aqlall(aqlobj,callback);
};

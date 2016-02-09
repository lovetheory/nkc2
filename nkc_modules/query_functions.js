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
        callback('counter '+countername.toString()+' may not be available',null);
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

exports.doc_list = (restrictions,callback)=>{
  if(!restrictions.start)restrictions.start=0;
  if(!restrictions.count)restrictions.count=100;

  var aqlobj={
    query:`
    FOR c IN ${restrictions.type}
    FILTER c.${restrictions.filter_by} == '${restrictions.equals}'
    sort c.${restrictions.sort_by} ${restrictions.order}
    limit ${restrictions.start}, ${restrictions.count}
    return c
    `
  };

  aqlall(aqlobj,callback);
};

exports.doc_list_join = (restrictions,callback)=>{
  if(!restrictions.start)restrictions.start=0;
  if(!restrictions.count)restrictions.count=100;

  var aqlobj={
    query:`
    FOR c IN ${restrictions.type}
    FILTER c.${restrictions.filter_by} == '${restrictions.equals}'
    sort c.${restrictions.sort_by} ${restrictions.order}
    limit ${restrictions.start}, ${restrictions.count}
    FOR p IN ${restrictions.join_collection}
    FILTER p.${restrictions.join_filter_by} == c.${restrictions.join_equals_attrib}
    return merge(c,{${restrictions.join_equals_attrib}:p})
    `
  };

  aqlall(aqlobj,callback);
};

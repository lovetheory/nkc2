//api functions
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

exports.incr_counter = function(countername,callback){
  //1. switch database
  db.useDatabase('nkc');

  //2. query
  db.query(
    'FOR c IN counters'
    + ' FILTER c._key == @countername'
    + ' UPDATE c WITH {count:c.count+1} IN counters'
    + ' RETURN NEW.count'
    //leading space is important
    ,{'countername':countername}
  )
  .then
  (
    cursor => {
      // cursor is a cursor for the query result
      cursor.next().then(val => {
        if(val){
          callback(null,val);
        } else {
          callback('counter may not be available',null);
        }
      });
    },
    err => {
      callback(err,null);
    }
  );
};

//standardrize the result retrieved from Arangodb
exports.result_reform = (result)=>{
  return {
    'id' : result._key,
    'version': result._rev,
  };
};

exports.doc_save = (doc,collection_name,callback)=>{
  db.collection(collection_name).save(doc,(err,result)=>
  {
    if(err)callback(err);else callback(null,result);
  });
};

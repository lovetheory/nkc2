//api functions
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');

var db = require('arangojs')(settings.arango.address);
db.useDatabase('testdb');
var testdata = db.collection('testdata');

var express = require('express');
var api = express.Router();

var validation = require('validation');
var queryfunc = require('query_functions');

exports.get_new_pid = function(callback){
  queryfunc.incr_counter('posts',callback);
};

exports.get_new_tid = function(callback){
  queryfunc.incr_counter('threads',callback);
};

exports.get_new_fid = function(callback){
  queryfunc.incr_counter('forums',callback);
};

exports.get_new_uid = function(callback){
  queryfunc.incr_counter('users',callback);
};

//post to a forum, generating new threads.
exports.post_to_forum = function(post,fid,callback){
  var r = validation.validatePost(post);
  if(r!=true)
  {
    callback(r,null);//err thrown
  }
  else
  {
    //obtain new tid
    exports.get_new_tid((err,newtid) =>
    {
      if(err)callback(err,null);else
      {
        //now we got brand new tid.

        //create a new thread
        var timestamp = Date.now();
        var newthread =
        {
          _key:newtid.toString(),//key must be string.
          fid:fid.toString(),
          toc:timestamp,
          tlm:timestamp,
        };

        //insert that thread into threads collection
        db.useDatabase('nkc');
        var threads = db.collection('threads');
        threads.save(newthread,(err,result)=>
        {
          if(err)callback(err,null);else
          {
            //now post to the newly created thread.
            exports.post_to_thread(post,newtid,(err,result)=>{
              if(err)callback(err);else callback(null,result);
            });
          };
        });
      };
    });
  };
};

//post to a given thread.
exports.post_to_thread = (post,tid,callback) =>
{
  //apply for a new pid
  exports.get_new_pid((err,newpid) =>{
    if(err)callback(err,null);else
    {
      //create a new post
      var timestamp = Date.now();
      var newpost = {
        _key:newpid.toString(),
        tid:tid.toString(),
        toc:timestamp,
        tlm:timestamp,
        c:post.content,
      };

      //insert the new post into posts collection
      queryfunc.doc_save
      (
        newpost,'posts',
        (err,result)=>{if(err)callback(err);else callback(null,result);}
      );
    }
  });
};

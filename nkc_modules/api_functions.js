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
  if(r!=true)//if failed to validate
  {
    callback(r);//err thrown
  }
  else
  {
    //obtain new tid
    exports.get_new_tid((err,newtid) =>
    {
      if(err)callback(err);else
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

        //save this new thread
        queryfunc.doc_save(newthread,'threads',(err,result)=>
        {
          if(err)callback(err);else
          {
            //now post to the newly created thread.
            exports.post_to_thread(post,newtid,callback,true);
          };
        });
      };
    });
  };
};

//post to a given thread.
exports.post_to_thread = (post,tid,callback,isFirst) =>
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
        c:post.c,
        t:post.t,
        l:post.l,
      };

      //insert the new post into posts collection
      queryfunc.doc_save(newpost,'posts',(err,back)=>{
        if(err)callback(err);else{

          //update the thread object
          var props = {
            tlm:timestamp,//update timestamp
            lm:newpid.toString(),//point to newly created post
          };

          if(isFirst){//if this is the first post of the thread
            props.oc = newpid.toString();
            props.toc = timestamp;
          }

          queryfunc.doc_update(tid.toString(),'threads',props,callback);
        }
      });
    }
  });
};

exports.get_a_post = (pid,callback)=>{
  queryfunc.doc_load(pid.toString(),'posts',callback);
};

//return a list of posts within a thread.
exports.get_post_from_thread = (params,callback)=>{
  queryfunc.doc_list(
    {
      type:'posts',
      filter_by:'tid',
      equals:params.tid,
      sort_by:'toc',
      order:'asc',
      start:params.start,
      count:params.count
    },
    callback);
  };

  //return a list of threads, whose first posts are included.
  exports.get_thread_from_forum = (params,callback)=>{
    queryfunc.doc_list_join(
      {
        type:'threads',
        filter_by:'fid',
        equals:params.fid,
        sort_by:'tlm',
        order:'desc',
        start:params.start,
        count:params.count,

        join_collection:'posts',
        join_filter_by:'_key',
        join_equals_attrib:'lm',
      },
      callback);
    };

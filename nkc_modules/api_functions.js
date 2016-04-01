//api functions
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');

var async = require('async');

var db = require('arangojs')(settings.arango.address);
db.useDatabase('testdb');
var testdata = db.collection('testdata');

var express = require('express');
var api = express.Router();

var validation = require('validation');
var queryfunc = require('query_functions');

var cookie_signature = require('cookie-signature');
var apifunc = {};

apifunc.get_new_pid = function(callback){
  queryfunc.incr_counter('posts',callback);
};

apifunc.get_new_tid = function(callback){
  queryfunc.incr_counter('threads',callback);
};

apifunc.get_new_fid = function(callback){
  queryfunc.incr_counter('forums',callback);
};

apifunc.get_new_uid = function(callback){
  queryfunc.incr_counter('users',callback);
};

apifunc.get_new_rid = function(callback){
  queryfunc.incr_counter('resources',callback);
};

apifunc.get_all_forums = function(callback){
  queryfunc.doc_list_all({
    type:'forums',
  },
  callback);
}

//post to a given thread.
apifunc.post_to_thread = function(post,tid,callback,isFirst){
  //check existence
  apifunc.exists(tid,'threads',(err,th)=>{
    if(err){
      callback(err);
      return;
    }
    //th is the thread object now

    //apply for a new pid
    apifunc.get_new_pid((err,newpid) =>{
      if(err)callback(err,null);else
      {
        //create a new post
        var timestamp = Date.now();
        var newpost = { //accept only listed attribute
          _key:newpid,
          tid:tid,
          toc:timestamp,
          tlm:timestamp,
          c:post.c,
          t:post.t,
          l:post.l,
          uid:post.uid,
          username:post.username,
        };

        //insert the new post into posts collection
        queryfunc.doc_save(newpost,'posts',(err,back)=>{
          if(err)callback(err);else{
            callback(null,tid);
            //okay to respond the user

            //update thread object to make sync
            queryfunc.update_thread(tid);
          }
        });
      }
    });
  });
};

//post to a forum, generating new threads.
apifunc.post_to_forum = function(post,fid,callback){
  //check existence
  apifunc.exists(fid,'forums',function(err,fo){
    if(err){callback(err);return;}
    //fo is the forum object now
    //obtain new tid
    apifunc.get_new_tid((err,newtid) =>
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
            apifunc.post_to_thread(post,newtid,callback,true);
          };
        });
      };
    });
  });
};

//get post object from database
apifunc.get_a_post = (pid,callback)=>{
  queryfunc.doc_load(pid.toString(),'posts',callback);
};

//return a list of posts within a thread.
apifunc.get_post_from_thread = (params,callback)=>{
  queryfunc.doc_list({
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

//get thread object from database.
apifunc.get_a_thread = (tid,callback)=>{
  queryfunc.doc_load(tid.toString(),'threads',callback);
};

//return a list of threads.
apifunc.get_threads_from_forum = (params,callback)=>{
  queryfunc.doc_list({
    type:'threads',
    filter_by:'fid',
    equals:params.fid,
    sort_by:'lm.tlm',
    order:'desc',
    start:params.start,
    count:params.count,
  },
  callback);
};

//get forum object.
apifunc.get_threads_from_forum_as_forum = (params,callback)=>{
  async.waterfall
  ([
    function(next){
      next(null,{});
    },
    function(result,next){
      if(params.no_forum_inclusion){
        return next(null,result);
      }
      queryfunc.doc_load(params.fid,'forums',(err,forum)=>{
        if(err){next(err);return;}
        result.forum = forum;
        next(null,result);
      });
    },
    function(result,next){
      apifunc.get_threads_from_forum(params,(err,threads)=>{
        if(err){next(err);return;}
        result.threads = threads;
        next(null,result);
      });
    }
  ],callback);
};

apifunc.get_posts_from_thread_as_thread = (params,callback)=>{
  async.waterfall
  ([
    function(next){
      next(null,{});
    },
    function(result,next){
      apifunc.get_a_thread(params.tid,(err,thread)=>{
        if(err){next(err);return;}
        result.thread = thread;
        next(null,result);
      });
    },
    function(result,next){
      apifunc.get_post_from_thread(params,(err,posts)=>{
        if(err){next(err);return;}
        result.posts = posts;
        next(null,result);
      });
    },
  ],
  callback);
};


//check if an entity exists/ is available
apifunc.exists = function(key,type,callback){
  queryfunc.doc_load(key,type,callback);
};

apifunc.get_user_by_name = (username,callback)=>{
  queryfunc.doc_list({
    type:'users',
    filter_by:'username',
    equals:username,
    sort_by:'username',
    order:'asc',
  },
  callback);
};

apifunc.get_user = (uid,callback)=>{
  queryfunc.doc_load(uid,'users',function(err,back){
    if(err)return callback(err);
    //desensitize
    back.password == null;
    callback(null,back);
  });
};

function user_exist_by_name(username,callback){
  apifunc.get_user_by_name(username,(err,back)=>{
    if(err){
      callback(err);
    }
    else{
      if(back.length==0){
        callback(null,false);//user not exist
      }else{
        callback(null,true);//user does exist
      }
    }
  });
};

//user creation
apifunc.create_user = function(user,callback){
  //check if user exists.
  user_exist_by_name(user.username,(err,back)=>{
    if(err)callback(err);else{
      if(back){
        //if user exists
        callback('user exists already');
      }else{
        //user not exist, create user now!
        //obtain an uid first...
        apifunc.get_new_uid((err,newuid)=>{
          if(err)callback(err);else{
            //construct the new user object
            user._key = newuid;
            var timestamp = Date.now();
            user.toc = timestamp;
            user.tlv = timestamp;
            user.certs = ['default'];//if not exist default to 'default'

            queryfunc.doc_save(user,'users',callback);
          }
        });
      }
    }
  });
}

//determine if given password matches the username
apifunc.verify_user = function(user,callback){
  apifunc.get_user_by_name(user.username,(err,back)=>{
    if(err)return callback(err);
    if(back.length===0)//user not exist
    return callback('user not exist by name');

    //if user exists
    if(back[0].password === user.password){
      callback(null,back[0]); // return the user
    }
    else {
      callback(null,false); //return false, indicating unmatch
    }
  });
}

apifunc.get_resources = function(key,callback){
  queryfunc.doc_load(key,'resources',callback);
}

apifunc.get_questions = function(uid,callback){
  if(uid){
    queryfunc.doc_list({
      type:'questions',
      filter_by:'uid',
      equals:uid,
      sort_by:'toc',
      order:'desc',
    },
    callback);
  }
  else{
    //if uid === null
    queryfunc.doc_list_all_questions(null,callback);
  }
}

apifunc.get_certain_questions = function(qlist,callback)
{
  queryfunc.doc_list_certain_questions(qlist,callback);
}

apifunc.post_questions = function(question,callback){
  queryfunc.doc_save(question,'questions',callback);
}

var rs = require('random-seed')

apifunc.exam_gen = function(options,callback){

  apifunc.get_questions(null,function(err,questions){
    if(err)return callback(err);
    //questions got

    var qlen = questions.length;
    if(qlen<settings.exam.number_of_questions)return callback('no enough questions in base.')

    //seed the random generator,
    //to provide the same set of questions during every refresh_period
    var rand = rs.create(
      options.iptrim + Math.floor(Date.now()/settings.exam.refresh_period).toString()
    );

    var qarr = [];
    for(var i = 0;i<settings.exam.number_of_questions;i++){
      while(1)
      {
        var r = Math.floor(rand.random()*qlen);//random int btween 0 and qlen
        if(qarr.indexOf(r)<0)//if selection not already exist in array
        {
          qarr.push(r);
          break;
        }
      }
    }

    //now qarr should contain 6 numbers between 0 and qlen, no repeating.

    for(i in qarr){
      var qobj = {};
      var originalquestion = questions[qarr[i]];

      qobj.question = originalquestion.question;
      qobj.type = originalquestion.type;
      switch (qobj.type) {
        case 'ch4':
        //qobj.choices = shuffle(originalquestion.answer);
        qobj.choices = originalquestion.answer;
        shuffle(qobj.choices);
        break;
        default:break;
      }
      qobj.qid = originalquestion._key;
      qarr[i]=qobj;
    }

    var exam = {};
    exam.qarr = qarr;
    exam.toc = Date.now();

    var signature = ''; //generate signature, to avoid spoofing
    for(i in exam.qarr){
      signature += exam.qarr[i].qid;
    }
    signature += exam.toc.toString();

    exam.signature = cookie_signature.sign(signature,settings.cookie_secret);

    return callback(null,exam);
  })
}

module.exports = apifunc;

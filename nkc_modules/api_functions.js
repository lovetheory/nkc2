//api functions
module.paths.push('./nkc_modules'); //enable require-ment for this path

var moment = require('moment');

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var bodyParser = require('body-parser');

var async = require('async');

var express = require('express');
var api = express.Router();

var validation = require('validation');
var queryfunc = require('query_functions');

var cookie_signature = require('cookie-signature');
var apifunc = {};

function npr(){
  return Promise.resolve()
}

apifunc.get_new_pid = function(callback){
  return queryfunc.incr_counter('posts',callback);
};

apifunc.get_new_tid = function(callback){
  return queryfunc.incr_counter('threads',callback);
};

apifunc.get_new_fid = function(callback){
  return queryfunc.incr_counter('forums',callback);
};

apifunc.get_new_uid = function(callback){
  return queryfunc.incr_counter('users',callback);
};

apifunc.get_new_rid = function(callback){
  return queryfunc.incr_counter('resources',callback);
};

apifunc.get_all_forums = function(callback){
  return queryfunc.doc_list_all({
    type:'forums',
  },
  callback);
}

//post to a given thread.
apifunc.post_to_thread = function(post,tid,isFirst){
  //check existence
  return apifunc.exists(tid,'threads')
  .then((th)=>{
    //th is the thread object now

    //apply for a new pid
    return apifunc.get_new_pid();
  })

  .then((newpid) =>{
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
    return queryfunc.doc_save(newpost,'posts')
  })

  .then((back)=>{
    //update thread object to make sync
    queryfunc.update_thread(tid);
    back.tid=tid;
    return back;
    //okay to respond the user
  })
};

//post to a forum, generating new threads.
apifunc.post_to_forum = function(post,fid,callback){
  var newtid;

  //check existence
  return apifunc.exists(fid,'forums')
  .then(function(fo){
    //fo is the forum object now

    //obtain new tid
    return apifunc.get_new_tid()
  })
  .then((gottid)=>{
    newtid = gottid;
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
    return queryfunc.doc_save(newthread,'threads')
  })
  .then((result)=>{
    return apifunc.post_to_thread(post,newtid,true);
  })
};

apifunc.edit_post = function(post,pid,callback){
  var timestamp,newpost;

  return queryfunc.doc_load(pid,'posts')
  .then(original_post=>{
    timestamp = Date.now();
    //create new post
    newpost = { //accept only listed attribute
      _key:original_post._key,
      tid:original_post.tid,
      toc:original_post.toc,
      tlm:timestamp,
      c:post.c,
      t:post.t,
      l:post.l,
      uid:original_post.uid,
      username:original_post.username,
    };

    //modification to the original
    original_post.pid = original_post._key;
    original_post._key = undefined;

    //now save original to history;
    return queryfunc.doc_save(original_post,'histories')
  })
  .then((back)=>{
    //now update the existing with the newly created:
    return queryfunc.doc_update(newpost._key,'posts',newpost);
  })
  .then(back=>{
    //update thread as needed.
    queryfunc.update_thread(newpost.tid);

    back.tid = newpost.tid;
    return back;
  })


  // //load original post
  // queryfunc.doc_load(pid,'posts',function(err,original_post){
  //   if(err)return callback(err);
  //   //loaded
  //
  //   var timestamp = Date.now();
  //
  //   //create new post
  //   var newpost = { //accept only listed attribute
  //     _key:original_post._key,
  //     tid:original_post.tid,
  //     toc:original_post.toc,
  //     tlm:timestamp,
  //     c:post.c,
  //     t:post.t,
  //     l:post.l,
  //     uid:original_post.uid,
  //     username:original_post.username,
  //   };
  //
  //   //modification to the original
  //   original_post.pid = original_post._key;
  //   original_post._key = undefined;
  //
  //   //now save original to history;
  //   queryfunc.doc_save(original_post,'histories',function(err,back){
  //     if(err)return callback(err);
  //
  //     //now update the existing with the newly created:
  //     queryfunc.doc_update(newpost._key,'posts',newpost,function(err,back){
  //       if(err)return callback(err);
  //       back.tid = newpost.tid;
  //       callback(null,back);
  //       //update thread as needed.
  //       queryfunc.update_thread(newpost.tid);
  //     })
  //   })
  // })
}

//get post object from database
apifunc.get_a_post = (pid)=>{
  return queryfunc.doc_load(pid.toString(),'posts');
};

//return a list of posts within a thread.
apifunc.get_post_from_thread = (params)=>{
  return queryfunc.doc_list({
    type:'posts',
    filter_by:'tid',
    equals:params.tid,
    sort_by:'toc',
    order:'asc',
    start:params.start,
    count:params.count
  });
};

//get thread object from database.
apifunc.get_a_thread = (tid,callback)=>{
  return queryfunc.doc_load(tid.toString(),'threads');
};

//return a list of threads.
apifunc.get_threads_from_forum = (params,callback)=>{
  return queryfunc.doc_list({
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
  var result ={};
  return npr()
  .then(()=>{
    if(params.no_forum_inclusion){
      return;
    }

    return queryfunc.doc_load(params.fid,'forums')
  })
  .then(forum=>{
    if(forum)
    result.forum = forum;

    return apifunc.get_threads_from_forum(params);
  })
  .then(threads=>{
    result.threads = threads;
    return result;
  })


  // async.waterfall
  // ([
  //   function(next){
  //     next(null,{});
  //   },
  //   function(result,next){
  //     if(params.no_forum_inclusion){
  //       return next(null,result);
  //     }
  //     queryfunc.doc_load(params.fid,'forums',(err,forum)=>{
  //       if(err){next(err);return;}
  //       result.forum = forum;
  //       next(null,result);
  //     });
  //   },
  //   function(result,next){
  //     apifunc.get_threads_from_forum(params,(err,threads)=>{
  //       if(err){next(err);return;}
  //       result.threads = threads;
  //       next(null,result);
  //     });
  //   }
  // ],callback);
};

apifunc.get_posts_from_thread_as_thread = (params)=>{
  var result = {};
  return apifunc.get_a_thread(params.tid)
  .then(thread=>{
    result.thread=thread;
    return apifunc.get_post_from_thread(params)
  })
  .then(posts=>{
    result.posts = posts;
    return result;
  })
  //
  //
  // async.waterfall
  // ([
  //   function(next){
  //     next(null,{});
  //   },
  //   function(result,next){
  //     apifunc.get_a_thread(params.tid,(err,thread)=>{
  //       if(err){next(err);return;}
  //       result.thread = thread;
  //       next(null,result);
  //     });
  //   },
  //   function(result,next){
  //     apifunc.get_post_from_thread(params,(err,posts)=>{
  //       if(err){next(err);return;}
  //       result.posts = posts;
  //       next(null,result);
  //     });
  //   },
  // ],
  // callback);
};


//check if an entity exists/ is available
apifunc.exists = function(key,type,callback){
  return queryfunc.doc_load(key,type,callback);
};

apifunc.get_user_by_name = (username,callback)=>{
  return queryfunc.doc_list({
    type:'users',
    filter_by:'username',
    equals:username,
    sort_by:'username',
    order:'asc',
  },
  callback);
};

apifunc.get_user = (uid)=>{
  return queryfunc.doc_load(uid,'users')
  .then(doc=>{
    //desensitize

    doc.password = undefined;
    doc.password2 = undefined;
    doc.hashtype = undefined;

    return doc;
  })
};

function user_exist_by_name(username){
  return apifunc.get_user_by_name(username)
  .then(back=>{
    if(back.length==0){
      return false;//user not exist
    }
    return true;//user does exist
  });
};

//user creation
apifunc.create_user = function(user,callback){
  //check if user exists.
  return user_exist_by_name(user.username)
  .then(exists=>{
    if(exists){
      //if user exists
      throw ('user exists already');
    }

    //user not exist, create user now!
    //obtain an uid first...
    return apifunc.get_new_uid()
  })
  .then((newuid)=>{
    user._key = newuid;
    var timestamp = Date.now();
    user.toc = timestamp;
    user.tlv = timestamp;
    user.certs = ['default'];//if not exist default to 'default'

    return queryfunc.doc_save(user,'users');
  })
}

//determine if given password matches the username
apifunc.verify_user = function(user,callback){
  return apifunc.get_user_by_name(user.username)
  .then((back)=>{
    if(back.length===0)//user not exist
    throw ('user not exist by name');

    //if user exists
    if(back[0].password !== user.password){
      throw ('password unmatch')
    }
    return (back[0]); // returns the user
  });
}

apifunc.get_resources = function(key,callback){
  return queryfunc.doc_load(key,'resources',callback);
}


apifunc.get_certain_questions = function(qlist,callback)
{
  return queryfunc.doc_list_certain_questions(qlist,callback);
}

apifunc.post_questions = function(question,callback){
  return queryfunc.doc_save(question,'questions',callback);
}

var rs = require('random-seed')

apifunc.exam_gen = function(options){
  var seed = options.iptrim + Math.floor(Date.now()/settings.exam.refresh_period).toString() + '123457'
  var category = options.category
  var layer = require('layer')

  var qarr = []

  return Promise.resolve()
  .then(()=>{
    if(category){
      return layer.Question.randomlyListQuestionsOfCategory(category,settings.exam.number_of_questions_subjective,seed+1)
      .then(arr=>{
        qarr = qarr.concat(arr)
        return layer.Question.randomlyListQuestionsOfCategory('common',settings.exam.number_of_questions_common,seed+2)
      })
      .then(arr=>{
        qarr = qarr.concat(arr)
      })
    }else{
      return layer.Question.randomlyListQuestionsOfCategory(null,settings.exam.number_of_questions,seed)//category, count, seed
      .then(arr=>{
        qarr=qarr.concat(arr)
      })
    }
  })
  .then(function(){
    console.log(qarr);

    for(i in qarr){
      var qobj = {};
      var originalquestion = qarr[i];

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
      qarr[i] = qobj;
    }

    var exam = {};

    shuffle(qarr);//mix the questions

    exam.qarr = qarr;
    exam.toc = Date.now();

    var signature = ''; //generate signature, to avoid spoofing
    for(i in exam.qarr){
      signature += exam.qarr[i].qid;
    }
    signature += exam.toc.toString();

    exam.signature = cookie_signature.sign(signature,settings.cookie_secret);

    return exam;
  })
}

module.exports = apifunc;

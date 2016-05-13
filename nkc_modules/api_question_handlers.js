//api questions request handlers
module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();

var async = require('async');

var express = require('express');
var api = express.Router();

var validation = require('validation');
var apifunc = require('api_functions');
var queryfunc = require('query_functions');

var cookie_signature = require('cookie-signature');


api.post('/questions',function(req,res,next){
  if(!req.user)return next('require login');
  if(!req.body)return next('bodyless');

  var question = req.body;

  if(!question.question||!question.answer||!question.type)return next('fuck you');

  question.username = req.user.username;
  question.uid = req.user._key;
  question.toc = Date.now();

  apifunc.post_questions(question)
  .then(back=>{
    res.obj = back;
  })
  .then(next)
  .catch(next)
});

api.get('/questions',function(req,res,next){
  if(!req.user)return next('require login');

  var param = req.user._key;
  if(req.query['all'])param=null;

  apifunc.get_questions(param)
  .then(back=>{
    res.obj = back;
    next();
  })
  .catch(next)
});

api.delete('/questions/:qid',function(req,res,next){
  if(!req.user)return next('login pls');

  queryfunc.doc_load(req.params.qid,'questions')
  .then(back=>{
    if(back.uid!==req.user._key)//if not owning the question
    throw 'not owning';

    return queryfunc.doc_kill(req.params.qid,'questions')
  })
  .then(back=>{
    res.obj=back;
    next();
  })
  .catch(next)
});

api.post('/exam',function(req,res,next){
  if(req.user)return next('not logged out.')

  var exam = req.body.exam;
  if(!exam)return next('fuck you, man')

  var signature = ''; //generate signature, then check against submission
  for(i in exam.qarr){
    signature += exam.qarr[i].qid;
  }
  signature += exam.toc.toString();

  var unsigned_signature = cookie_signature.unsign(exam.signature,settings.cookie_secret);
  if(unsigned_signature===false)return next('signature invalid. consider re-attend the exam.');
  if(unsigned_signature!==signature)return next('fuck you, man'); //sb's spoofing!!

  if(Date.now()-exam.toc > settings.exam.time_limit)return next('overtime. please refresh');

  // now things are valid, should check against answers.

  var sheet = req.body.sheet; //answersheet
  if(!sheet)return next('wtf you thinkin')
  if(sheet.length!=exam.qarr.length)return next('bitch')

  var qidlist = []
  for(i in exam.qarr)
  {
    qidlist.push(exam.qarr[i].qid)
  }

  var token;
  var questions;
  var score = 0;
  var records = [];

  apifunc.get_certain_questions(qidlist)
  .then(back=>{
    questions = back;

    for(i in questions){
      var correctness = false;

      if(sheet[i]===null||sheet[i]===undefined){ //null choices
        correctness = false;
      }else{
        switch (questions[i].type) {
          case 'ch4':
          correctness = (exam.qarr[i].choices[sheet[i]]==questions[i].answer[0])

          break;
          case 'ans':
          correctness = (sheet[i]==questions[i].answer);
          break;
          default:break;
        }
      }

      records.push({qid:qidlist[i],correct:correctness})
    }

    for(i in records){
      score += records[i].correct?1:0;
    }
    report(records);

    if(score<settings.exam.pass_score)return next('test failed');
    //passed the test.

    return queryfunc.doc_answersheet_from_ip(req.iptrim)
  })
  .then(back=>{
    if(back.length>0)
    {
      if(Date.now() - back[0].tsm < settings.exam.succeed_interval)
      //if re-succeed an exam within given amount of time
      {
        throw 'You succeeded too often. You don\'t really have to.'
      }
    }

    return new Promise(function(resolve,reject){
      require('crypto').randomBytes(16, function(err, buffer) {
        if(err)return reject(err);
        resolve(buffer);
      })
    })
  })
  .then(buffer=>{

    token = buffer.toString('hex');

    var answersheet = {
      records:records,
      ip:req.iptrim,
      score:score,
      toc:exam.toc,
      tsm:Date.now(),
      _key:token,
    }

    return queryfunc.doc_save(answersheet,'answersheets')
  })
  .then(back=>{
    res.obj = {
      token:token,
    }
    next();
  })
  .catch(next);
})


module.exports = api;

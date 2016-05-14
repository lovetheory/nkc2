module.paths.push(__projectroot + 'nkc_modules'); //enable require-ment for this path

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var validation = require('validation')
var AQL = queryfunc.AQL
var apifunc = require('api_functions')
var cookie_signature = require('cookie-signature')

var table = {};
module.exports = table;

table.submitExam = {
  requiredParams:{
    sheet:Object,
    exam:Object,
  },
  operation:function(params){
    if(params.user)throw 'not logged out.'

    var exam = params.exam;
    if(!exam)throw 'fuck you, man'

    var signature = ''; //generate signature, then check against submission
    for(i in exam.qarr){
      signature += exam.qarr[i].qid;
    }
    signature += exam.toc.toString();

    var unsigned_signature = cookie_signature.unsign(exam.signature,settings.cookie_secret);
    if(unsigned_signature===false)throw('signature invalid. consider re-attend the exam.');
    if(unsigned_signature!==signature)throw('signature problematic'); //sb's spoofing!!

    if(Date.now()-exam.toc > settings.exam.time_limit)throw('overtime. please refresh');

    // now things are valid, should check against answers.

    var sheet = params.sheet; //answersheet
    if(!sheet)throw('wtf you thinkin')
    if(sheet.length!=exam.qarr.length)throw('bitch')

    var qidlist = []
    for(i in exam.qarr)
    {
      qidlist.push(exam.qarr[i].qid)
    }

    var token;
    var questions;
    var score = 0;
    var records = [];

    return apifunc.get_certain_questions(qidlist)
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

      if(score<settings.exam.pass_score)throw('test failed');
      //passed the test.

      return queryfunc.doc_answersheet_from_ip(params._req.iptrim)
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
        ip:params._req.iptrim,
        score:score,
        toc:exam.toc,
        tsm:Date.now(),
        _key:token,
      }

      return queryfunc.doc_save(answersheet,'answersheets')
    })
    .then(back=>{
      return {
        token:token,
      }
    })
    //ends here
  },
}

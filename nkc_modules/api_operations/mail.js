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
var layer = require('../layer')

var nm = require('nodemailer')

try{
  var mailSecrets = require('mailSecrets.js')
}
catch(e){
  var mailSecrets = require('mailSecrets_template.js')
}

var transporter = nm.createTransport(mailSecrets.smtpConfig);

var sendMail = (mailOptions)=>{
  return transporter.sendMail(mailOptions);
}

var exampleMailOptions = {
  from: mailSecrets.senderString,
  to: 'redacted@noop.com',
  subject: 'noop',
  text: 'redacted',
};

var table = {};
module.exports = table;

table.testMail = {
  operation:function(params){
    return sendMail(exampleMailOptions)
    .then(info=>{
      return info
    })
  }
}

table.forgotPassword = {
  operation:function(params){
    var u = new layer.User()
    return u.loadByName(params.username)
    .then(u=>
      (new layer.Personal(u.model._key)).load()
    )
    .then(p=>{
      //the person does exist
      var email=p.model.email
      if(!email||!email.length)throw '该账户没有记录有效的邮件信息。'

      //generate a random token and save it
      var token = Math.floor((Math.random()*(65536*65536))).toString(16)
      var mc = new layer.BaseDao('mailcodes')
      return mc.save({
        token,
        toc:Date.now(),
        uid:u.model._key,
        email,
        username:u.model.username,
      })
      .then(()=>{

        return sendMail({
          from:exampleMailOptions.from,
          to:email,
          subject:'请求重置密码',
          text:`有人在 ${(new Date).toLocaleString()} 请求重置账户 ${u.model.username} 的密码。`+
          '如果这不是你的操作，请忽略。<a href="http://bbs.kechuang.org/forgotPassword?token='
          +token
          +'">http://bbs.kechuang.org/forgotPassword?token='
          +token
          +'</a>',
        })
      })
    })
    .then(res=>{
      return '邮件发送成功'
    })
  },
  requiredParams:{
    username:String,
  }
}

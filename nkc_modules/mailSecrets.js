//this is a template for mailSecrets.js

//copy, rename to 'mailSecrets.js' then tweak the settings

var alidayu = require('alidayu-node');

module.exports = {
  smtpConfig:{
    host: 'smtp.exmail.qq.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: 'it@kc.ac.cn',
      pass: 'ccD711q'
    }
  },

  sendSMS: function(phone, code, fn, callback){
    if(fn === 'register'){
      //注册用户走这里
      new alidayu('23632480', 'e264a8555d0ef54a9e881969572ed4d2').smsSend({
        sms_free_sign_name: '注册验证',  //短信签名
        sms_param: {"code": code, "product": "科创论坛"},
        rec_num: phone,
        sms_template_code: 'SMS_100770071',//注册模板
        sms_type: 'normal'
      }, callback)
    }
    else if(fn === 'reset'){
      //修改密码走这里
      new alidayu('23632480', 'e264a8555d0ef54a9e881969572ed4d2').smsSend({
        sms_free_sign_name: '变更密码',  //短信签名
        sms_param: {"code": code, "product": "科创论坛"},
        rec_num: phone,
        sms_template_code: 'SMS_100730069',//大于平台手机找回密码模板号
        sms_type: 'normal'
      }, callback)
    }
    else if(fn === 'bindMobile'){
      //现有账号实名认证 绑定手机号
      new alidayu('23632480', 'e264a8555d0ef54a9e881969572ed4d2').smsSend({
        sms_free_sign_name: '绑定手机号',  //短信签名
        sms_param: {"code": code, "product": "科创论坛"},
        rec_num: phone,
        sms_template_code: 'SMS_100770070',
        sms_type: 'normal'
      }, callback)
    }
    else throw '错误的sms调用方式'
  },

  senderString:'"中国科创联互联网中心" <it@kc.ac.cn>'
}

//this is a template for mailSecrets.js

//copy, rename to 'mailSecrets.js' then tweak the settings

module.exports = {
  smtpConfig:{
    host: 'smtp.exmail.qq.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: 'it@kc.ac.cn',
      pass: 'redacted'
    }
  },

  senderString:'"中国科创联互联网中心" <it@kc.ac.cn>'
}

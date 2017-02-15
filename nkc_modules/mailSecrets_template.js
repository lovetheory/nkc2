//this is a template for mailSecrets.js

//copy, rename to 'mailSecrets.js' then tweak the settings

module.exports = {
  smtpConfig:{
    host: 'smtp.exmail.qq.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: 'mailusername',
      pass: 'mailpassword'
    }
  },

  senderString:'"中国科创联互联网中心" <it@kc.ac.cn>'
}

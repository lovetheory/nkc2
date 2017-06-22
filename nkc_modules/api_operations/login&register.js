

var moment = require('moment')
var path = require('path')
var fs = require('fs.extra')
var settings = require('../server_settings.js');
var helper_mod = require('../helper.js')();
var queryfunc = require('../query_functions')
var validation = require('../validation')
var AQL = queryfunc.AQL;
const db = queryfunc.getDB();
const aql = queryfunc.getAql();
var apifunc = require('../api_functions')
var layer = require('../layer')
var nm = require('nodemailer')

try{
  var mailSecrets = require('../mailSecrets.js');
  var sendSMS = require('../mailSecrets.js').sendSMS;
}
catch(e){
  var mailSecrets = require('../mailSecrets_template.js');
  var sendSMS = require('../mailSecrets_template.js').sendSMS;
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

var regex_validation = require('../nkc_regex_validation');

var create_user = function(user){
  //check if user exists.

  return AQL(`for u in users filter u.username_lowercase == @newusername return u`,
    {newusername:user.username.toLowerCase()}
  )
  .then(resultArr=>{
    if(resultArr.length!=0)throw '用户名已存在，请输入其他用户名'

    //user not exist, create user now!
    //obtain an uid first...
    return apifunc.get_new_uid()
  })
  .then((newuid)=>{
    var timestamp = Date.now();

    var newuser = {
      _key:newuid,
      username:user.username,
      username_lowercase:user.username.toLowerCase(),
      toc:timestamp,
      tlv:timestamp,
      certs:[user.mobile?'mobile':'examinated'],
    }

    var salt = Math.floor((Math.random()*65536)).toString(16)
    var hash = sha256HMAC(user.password,salt)

    var newuser_personal = {
      _key:newuid,
      email:user.email,

      hashtype:'sha256HMAC',

      mobile:user.mobile, //if from mobile entry

      password:{
        hash:hash,
        salt:salt,
      },

      regcode:user.regcode,
    }

    return queryfunc.doc_save(newuser,'users')
    .then(()=>{
      return queryfunc.doc_save(newuser_personal,'users_personal')
    })
    .then(res=>{
      return res
    })
  })
}




var create_phoneuser = function(user){
  let uid;
  return AQL(`for u in users filter u.username_lowercase == @newusername return u`,
    {newusername:user.username.toLowerCase()}
  )
  .then(resultArr=>{
    if(resultArr.length!=0)throw '用户名已存在，请输入其他用户名'
    return apifunc.get_new_uid()
  })
  .then((newuid)=>{
    uid = newuid;
    console.log(newuid);
    var timestamp = Date.now();

    var newuser = {
      _key: uid,
      username:user.username,
      username_lowercase:user.username.toLowerCase(),
      toc:timestamp,
      tlv:timestamp,
      certs:['mobile'],
    }

    var salt = Math.floor((Math.random()*65536)).toString(16)
    var hash = sha256HMAC(user.password,salt)

    var newuser_personal = {
      _key:uid,
      email:user.email,
      hashtype:'sha256HMAC',
      mobile:user.mobile, //if from mobile entry
      password:{
        hash:hash,
        salt:salt,
      },
      regcode:user.regcode,
    }
    return queryfunc.doc_save(newuser,'users')
    .then(()=>{
      return queryfunc.doc_save(newuser_personal,'users_personal')
    })
    .then(res=>{
      return db.query(aql`
        INSERT {
          _key: ${uid},
          type: 'forum',
          abbr: SUBSTRING(${user.username}, 0, 6),
          display_name: CONCAT(${user.username}, '的专栏'),
          description: CONCAT(${user.username}, '的专栏'),
          moderators: [${user.username}],
          recPosts: []
        } INTO personalForums
        RETURN NEW
        `)
    })
      .then(res => res._result[0])
  })
}




function sha256HMAC(password,salt){
  const crypto = require('crypto')
  var hmac = crypto.createHmac('sha256',salt)
  hmac.update(password)
  return hmac.digest('hex')
}



table.userRegister = {
  init:function(){
    queryfunc.createIndex('users',{
      fields:['username'],
      type:'hash',
      unique:'true',
      sparse:'true',
    })

    queryfunc.createIndex('users',{
      fields:['username_lowercase'],
      type:'hash',
      unique:'true',
      sparse:'true',
    })

    queryfunc.createIndex('users_personal',{
      fields:['mobile'],
      type:'hash',
      unique:'true',
      sparse:'true',
    })
  },
  operation:function(params){
    var userobj = {
      username:params.username,
      password:params.password,
      email:params.email,
      regcode:params.regcode,
    }

    regex_validation.validate(params)

    if(params.password!==params.password2)throw '您两次输入的密码不匹配'

    function testAnswerSheet(code){
      var c = new layer.BaseDao('answersheets',code)
      return c.load()
      .catch(err=>{
        throw ('验证注册码失败，请检查！')
      })
      .then(c=>{
        return c.model
      })
      .then(ans=>{
        if(ans.uid) throw ('答卷的注册码过期，可能要重新参加考试')

        // NOTE: we don't want any of our registered user to help
        // others with the regcode.
        // so if the regcode provided is generated by some logged-in user,
        // we pretend that it has expired.

        if(Date.now() - ans.tsm>settings.exam.time_before_register)
        throw ('答卷的注册码过期，可能要重新参加考试')

        return create_user(userobj)
      })
      .then(res=>{
        var uid = res._key

        return c.update({uid})
        .then(a=>{
          return res
        })
      })
    }

    function testMobileCode(code){

      var mc = new layer.BaseDao('mobilecodes',code)
      return mc.load()
      .then(mc=>{
        //if code exists in mobilecodes
        var ans = mc.model

        if(ans.uid) throw ('此验证码已被使用过。')
        userobj.mobile = ans.mobile

        return create_user(userobj)
        .then(res=>{
          var uid = res._key
          return mc.update({uid})
          .then(a=>{
            return res
          })
        })
      })
    }

    function testCode(code){
      var mc = new layer.BaseDao('mobilecodes',code)
      var mobilecode_exist = false
      return mc.load()
      .then(()=>{
        mobilecode_exist=true
      })
      .catch(err=>{
        //mobilecode notexist
        mobilecode_exist=false
      })
      .then(()=>{
        if(mobilecode_exist){
          return testMobileCode(code)
        }
        else {
          return testAnswerSheet(code)
        }
      })
    }

    return testCode(userobj.regcode)
  },
  requiredParams:{
    username:String,
    password:String,
    password2:String,
    email:String,
    regcode:String,
  },
}



//手机用户注册 **
table.userPhoneRegister = {
  operation:function(params){
    var userobj = {
      username:params.username,
      password:params.password,
      phone:params.phone,
      mcode:params.mcode,
      icode:params.icode
    }
    var time = Date.now() - 2*60*1000  //2分钟之内的验证码

    return AQL(`
      for u in smscode
      filter u.phone == @phone && u.code == @mcode && u.toc >= @time
      return u
      `,{phone:params.phone,mcode:params.mcode,time:time}
    )
    .then(res=>{
      //console.log(res)
      if(res.length == 0) throw '手机验证码不正确，请检查'
      if( params.icode.toLowerCase() != params._req.session.icode.toLowerCase() ) throw '图片验证码不正确，请检查'
      return create_phoneuser(userobj)
    })
    .then(newuser=>{
      return AQL(`
        INSERT {
          mobile:@mobile, toc:@toc, uid:@uid
        } IN mobilecodes
        `,{mobile:params.phone, toc:Date.now(), uid:newuser._key}
      )

    })

  },
  requiredParams:{
    username:String,
    password:String,
    phone:String,
    mcode:String,
    icode:String
  }
}



//使用邮箱注册 **
table.userMailRegister = {
  operation:function(params) {
    var userobj = {
      username: params.username,
      password: params.password,
      email: params.email,
      icode: params.icode
    };
    const code = params.regCode;
    const c = new layer.BaseDao('answersheets', code);
    return c.load()
      .catch(err => {
        throw ('验证注册码失败，请检查！')
      })
      .then(c => {
        return c.model
      })
      .then(ans => {
        if (ans.uid) throw ('答卷的注册码过期，可能要重新参加考试')

        // NOTE: we don't want any of our registered user to help
        // others with the regcode.
        // so if the regcode provided is generated by some logged-in user,
        // we pretend that it has expired.

        if (Date.now() - ans.tsm > settings.exam.time_before_register)
          throw ('答卷的注册码过期，可能要重新参加考试')

        return AQL(`
            for u in emailRegister
            filter u.email == @email && u.toc > @time
            return u
            `, {email: params.email, time: Date.now() - 24 * 60 * 60 * 1000}
        )
      })
      .then(j => {
        if (j.length >= 5) throw '邮件发送次数已达上限，请隔天再试'
        return AQL(`
      for u in users
      filter u.username == @username
      return u
      `, {username: params.username}
        )
      })
      .then(res => {
        if (res.length > 0) throw "此用户名已存在，请更换一个"
        return AQL(`
          for u in users_personal
          filter u.email == @email
          return u
          `, {email: params.email}
        )
      })
      .then(res => {
        if (res.length > 0) throw "此邮箱已注册过，请检查或更换"
        if (params.icode.toLowerCase() != params._req.session.icode.toLowerCase()) throw '图片验证码不正确，请检查'

        var ecode = random(14);
        let salt = Math.floor(Math.random() * 65536).toString(16);
        let hash = sha256HMAC(params.password, salt);
        AQL(`
          INSERT {
            email: @email,
            ecode: @ecode,
            toc: @time,
            username:@username,
            hashtype: 'sha256HMAC',
            password: {
              hash: @hash,
              salt: @salt
            }
          } IN emailRegister
          `,
          {
            email: params.email,
            ecode: ecode,
            time: Date.now(),
            username: params.username,
            hash: hash,
            salt: salt
          }
        )
        return {email: params.email, ecode: ecode}
      })
      .then(res => {
        var text = '欢迎注册科创论坛，点击以下链接就可以激活您的账户：'
        var href = 'http://bbs.kechuang.org/activeEmail?email=' + res.email + '&ecode=' + res.ecode
        //var href = 'http://127.0.0.1:1086/activeEmail?email='+res.email+'&ecode='+res.ecode
        var link =
          '<a href="' + href + '">' + href + '</a>'
        return sendMail({
          from: exampleMailOptions.from,
          to: params.email,
          subject: '注册账户',
          text: text + href,
          html: text + link,
        })
      })
      .then(() => ({_key: 'registered'}))
      .then(res => {
        const uid = res._key;
        return c.update({uid})
      })
  },
  requiredParams:{
    username:String,
    password:String,
    email:String,
    icode:String
  }
}





function md5(str){
  var md5 = require('crypto').createHash('md5')
  md5.update(str)
  return md5.digest('hex')
}

function testPassword(input,hashtype,storedPassword){
  switch (hashtype) {
    case 'pw9':
    var pass = input
    var hash = storedPassword.hash
    var salt = storedPassword.salt

    var hashed = md5(md5(pass)+salt)
    if(hashed!==hash){
      throw('密码不正确，请重新输入')
    }
    break;

    case 'sha256HMAC':
    var pass = input
    var hash = storedPassword.hash
    var salt = storedPassword.salt

    var hashed = sha256HMAC(pass,salt)
    if(hashed!==hash){
      throw('密码不正确，请重新输入')
    }
    break;

    default:
    if(input !== storedPassword){ //fallback to plain
      throw ('密码不正确，请重新输入')
    }
  }
  return true
}


table.userLogin = {
  init:function(){

  },
  operation:function(params){
    var user = {}
    return AQL(`for u in users filter u.username_lowercase == @username return u`,
      {username:params.username.toLowerCase()}
    )
    .then((back)=>{
      if(back.length!==1)//user not exist
      throw ('用户名不存在，请检查用户名');

      user = back[0]

      return queryfunc.doc_load(user._key,'users_personal')
    })
    .then(user_personal=>{

      var tries = user_personal.tries||1
      var lasttry = user_personal.lasttry||Date.now()

      if(tries>10 && Date.now() - user_personal.lasttry < 3600*1000)throw '密码错误次数过多，请在一个小时之后再输入'

      if(/brucezz|zzy2|3131986|1986313|19.+wjs|wjs.+86/.test(params.password)){
        throw '注册码已过期，请重新考试'
      }

      try{
        testPassword(params.password,user_personal.hashtype,user_personal.password)
      }
      catch(err){
        var tries = user_personal.tries||1
        var lasttry = Date.now()

        var nup={tries:tries+1,lasttry:lasttry}

        queryfunc.doc_update(user_personal._key,'users_personal',nup)
        .then(()=>{
          report('shit','sum one failed on his password'+nup.tries.toString()) //report类似console
        })

        throw err
      }

      queryfunc.doc_update(user_personal._key,'users_personal',{tries:0})
      .then(()=>{
        report('yo','sum one succeeded on his password'+user_personal.tries.toString())
      })

      //if user exists
      var cookieobj = {
        username:user.username,
        uid:user._key,
        lastlogin:Date.now(),
      }

      //put a signed cookie in header
      params._res.cookie('userinfo',JSON.stringify(cookieobj),{
        signed:true,
        maxAge:settings.cookie_life,
        httpOnly:true,
      });

      var signed_cookie = params._res.get('set-cookie');

      //put the signed cookie in response, also
      return {'cookie':signed_cookie,'instructions':
      'please put this cookie in request header for api access'};
    })
  },
  requiredParams:{
    username:String,
    password:String,
  },
}



function newPasswordObject(plain){
  var salt = Math.floor((Math.random()*65536)).toString(16)
  var hash = sha256HMAC(plain,salt)

  var pwobj = {
    hashtype:'sha256HMAC',

    password:{
      hash:hash,
      salt:salt,
    },
  }

  return pwobj
}

table.changePassword = {
  operation:function(params){
    regex_validation.validate({
      password:params.newpassword
    })

    if(params.newpassword!==params.newpassword2)throw '两次密码不一致'

    var psnl = new layer.Personal(params.user._key)
    return psnl.load()
    .then(psnl=>{
      testPassword(params.oldpassword,psnl.model.hashtype,psnl.model.password)

      var pwobj = newPasswordObject(params.newpassword)

      return psnl.update(pwobj)
      .then(psnl=>{
        return 'done'
      })
    })

  },
  requiredParams:{
    oldpassword:String,
    newpassword:String,
    newpassword2:String,
  }
}



table.newPasswordWithToken = {
  //if user forgot his password, and received a token via email verification
  operation:function(params){
    regex_validation.validate({
      password:params.password
    })

    if(params.password!==params.password2)throw '两次密码不一致'

    var mc
    return AQL(`for c in mailcodes
      filter c.token == @token &&
      c.toc > (date_now()-86400000)
      //1d
      return c
      `,{token:params.token}
    )
    .then(res=>{
      if(!res.length) throw 'token过期或不存在。请尝试重新发送邮件'
      mc=res[0] //mailcode Object
      if(mc.used) throw '此token之前已经被使用过了。'

      //mark as used
      return AQL(`let c = document(mailcodes,@id)
      update c with {used:true} in mailcodes`,{id:mc._key})

      .then(()=>{
        var p = new layer.Personal(mc.uid)
        return p.update(newPasswordObject(params.password))
        .then(p=>{
          return 'done'
        })
      })
    })
  },
  requiredParams:{
    password:String,
    password2:String,
    token:String,
  }
}





table.userLogout = {
  operation:function(params){
    params._res.cookie('userinfo',{info:'nkc_logged_out'},{
      signed:true,
      expires:(new Date(Date.now()-86400000)),
    });

    return {}
  }
}

// var request = require('request')
//
// table.sendMobileMessage = {
//   operation:function(params){
//     var num = params.number
//     return {message:'sent to '+num}
//
//   }
// }

table.getRegcodeFromMobile = {
  operation:function(params){
    var mobile = params.mobile
    return AQL(`for m in mobilelogs
      filter m.mobile == @mobile
      filter m.toc>date_now()-60*1000*10 //10 minutes

      //filter m.mobile == m.content
      //well, dont filter here

      limit 1
      return m
      `,{mobile}
    )
    .then(arr=>{
      if(arr.length==0)throw '暂无符合要求的短信记录，可能是短信未送达，或者所使用的短信格式有误。'

      //now check if this mobilenumber was already registered by sb
      return AQL(`
        for u in users_personal
        filter u.mobile == @mobile
        return u
        `,{mobile}
      )
      .then(k=>{
        if(k.length>0) throw '此号码已经用于其他用户注册。'
      })
      .then(()=>{
        //if matched
        return layer.RegCode.generate()
      })
      .then(code=>{

        if(params.user){
          //if user logged in

          queryfunc.addCertToUser(params.user._key,'mobile')
          var up = new layer.Personal(params.user._key)
          up.update({mobile})
        }

        var record = arr[0]
        var ans = new layer.BaseDao('mobilecodes',code)
        var uid = params.user?params.user._key:undefined

        return ans.save({
          toc:Date.now(),
          mobile:record.mobile,
          uid,
        })
        .then(ans=>{
          return {code,uid}
        })
      })
    })
  },
  requiredParams:{
    mobile:String,
  }
}


//手机注册获取验证码
table.getMcode = {
  operation:function(params){
    var phone = params.phone;
    var icode = params.icode;
    var code = random(6);
    var time = new Date().getTime();
    var time2 = Date.now()-24*60*60*1000;
    //console.log(phone,code);

    return AQL(`
      for u in smscode
      filter u.phone == @phone && u.toc > @time2
      return u
      `,{phone, time2}
    )
    .then(j=>{
      if(icode.toLowerCase() != params._req.session.icode.toLowerCase() ) throw '图片验证码不正确，请检查'
      if(j.length >= 5) throw '短信发送次数已达上限，请隔天再试'
      return AQL(`
        for u in mobilecodes
        filter u.mobile == @phone
        return u
        `,{phone}
      )
    })
    .then(k=>{
      if(k.length>0){
        throw '此号码已经用于其他用户注册，请检查或更换'
      }else{
        sendSMS(phone, code , 'register',function(err,res){//调用注册方法
          if(err){
            console.log(err)
            console.log(code);
          }else{
            console.log(res)
          }
        })
      }
      return AQL(`
        INSERT {
          phone: @phone, code: @code, toc: @time, type:1
        } IN smscode
        `,{phone,code,time}
      )

    })
  },
  requiredParams:{
    phone:String,
  }
}



//手机找回密码的验证码
table.getMcode2 = {
  operation:function(params){
    var phone = params.phone;
    var username = params.username;
    var icode = params.icode;
    var code = random(6);
    var time = new Date().getTime();
    var time2 = Date.now()-24*60*60*1000;
    //console.log(phone,code);

    return AQL(`
      for u in smscode
      filter u.phone == @phone && u.toc > @time2
      return u
      `,{phone, time2}
    )
    .then(j=>{
      if(icode.toLowerCase() != params._req.session.icode3.toLowerCase() ) throw '图片验证码不正确，请检查'
      if(j.length >= 5) throw '短信发送次数已达上限，请隔天再试'
      return AQL(`
        for u in mobilecodes
        filter u.mobile == @phone
        return u
        `,{phone}
      )
    })
    .then(k=>{
      if(k.length == 0) throw '没有找到该手机号码，请检查'
      return AQL(`
        for u in users
        filter u._key == @uid
        return u
        `,{uid:k[0].uid}
      )
    })
    .then(m=>{
      if(m[0].username != username) throw '用户名和手机号码不对应，请检查'
      sendSMS(phone, code , 'reset', function(err,res){ //2调用修改密码方法
        if(err){
          console.log(err)
        }else{
          console.log(res)
        }
      })
      return AQL(`
        INSERT {
          phone: @phone, code: @code, toc: @time, type:2
        } IN smscode
        `,{phone,code,time}
      )
    })


  },
  requiredParams:{
    phone:String,
  }
}



table.pchangePassword = {
  operation:function(params){
    var phone = params.phone;
    var mcode = params.mcode;
    var password = params.password;
    //var passobj = newPasswordObject(password);
    var time = Date.now();
    var time2 = time - 2*60*1000;

    return AQL(`
      for u in smscode
      filter u.phone == @phone && u.code == @mcode && u.toc > @time2
      return u
      `,{phone,mcode,time2}
    )
    .then(a=>{
      if(a.length == 0) throw '短信验证码不正确或已过期'
      return AQL(`
        for u in mobilecodes
        filter u.mobile == @phone
        return u
        `,{phone}
      )
    })
    .then(b=>{
      var p = new layer.Personal(b[0].uid)
      return p.update(newPasswordObject(password))
    })

  }
}





//产生随机数
function random(n){  //n是位数
  var Num="";
  for(var i=0;i<n;i++){
    Num+=Math.floor(Math.random()*10);
  }
  return Num;
}

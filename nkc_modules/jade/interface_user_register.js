function error_report(str)
{
  geid('error_info').innerHTML = JSON.stringify(str);
  display('error_info_panel')

  screenTopWarning(JSON.stringify(str))
}

function register_submit(){
  return Promise.resolve()
  .then(function(){
    var userobj={
      username : gv('username'),
      password : gv('password'),
      password2 : gv('password2'),
      email:gv('email'),
      regcode:gv('regcode'),
    }

    //client side validation
    if(userobj.regcode.length<10){
      throw('注册码填对了？')
      return;
    }

    //client side validation
    if(userobj.password2!==userobj.password){
      throw('两遍密码不一致。')
      return;
    }

    nkc_validate_fields(userobj);

    return nkcAPI('userRegister',userobj)
  })
  .then(function(result){
    window.location = '/login'
  })
  .catch(function(err){
    error_report(err);
  })

}

function username_keypress(){
  e = event ? event :(window.event ? window.event : null);
  if(e.keyCode===13||e.which===13)
  geid('email').focus();
}

function email_keypress(){
  e = event ? event :(window.event ? window.event : null);
  if(e.keyCode===13||e.which===13)
  geid('password').focus();
}

function password_keypress(){
  e = event ? event :(window.event ? window.event : null);
  if(e.keyCode===13||e.which===13)
  geid('password2').focus();
}

function password2_keypress(){
  e = event ? event :(window.event ? window.event : null);
  if(e.keyCode===13||e.which===13)
  register_submit();
}

if(gv('regcode')!=''){
    geid('regcode').focus()
}else{
}

function getRegcodeFromMobile(){
  var number = geid('mobilenumber').value.trim()
  if(number.length<11){
    return screenTopWarning('请输入11位手机号码')
  }
  nkcAPI('getRegcodeFromMobile',{mobile:number})
  .then(function(ret){
    if(ret.code){
      window.location = 'register?code='+ret.code
    }
  })
  .catch(jwarning)
}

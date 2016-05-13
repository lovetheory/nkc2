function error_report(str)
{
  geid('error_info').innerHTML = JSON.stringify(str);
  display('error_info_panel')
}

function register_submit(){
  return Promise.resolve()
  .then(()=>{
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
  .then(result=>{
    window.location = '/login'
  })
  .catch(err=>{
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

if(gv('regcode')!='')
geid('username').focus()
else
geid('regcode').focus()

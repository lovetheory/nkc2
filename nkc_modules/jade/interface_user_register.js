function register_submit(){
  var userobj={
    username : gv('username'),
    password : gv('password'),
    password2 : gv('password2'),
    email:gv('email'),
    regcode:gv('regcode'),
  }

  //client side validation
  if(userobj.regcode.length<10){
    geid('error_info').innerHTML = ('注册码填对了？')
    display('error_info_panel')
    return;
  }

  //client side validation
  if(userobj.password2!==userobj.password){
    geid('error_info').innerHTML = ('两遍密码不一致。')
    display('error_info_panel')
    return;
  }

  var result = nkc_validate_fields(userobj);
  if(result){
    geid('error_info').innerHTML = '项 “'+result.toString()+'” 的值不符合要求，请修改。';
    display('error_info_panel')
  }else{
    //alert('allright');
    post_api('user',userobj,function(err,back){
      geid('error_info').innerHTML = back;
      display('error_info_panel')

      if(err){return;}
      //else
      //alert(back);
      //success!

      window.location = '/login';
    });
  }
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

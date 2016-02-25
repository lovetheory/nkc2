function login_submit(){
  var userobj={
    username : gv('username'),
    password : gv('password'),
  }

  if(userobj.username=='')
  return alert('工作累了，就要休息一下。不要强迫自己上网。仔细看看，用户名是不是没有填？');
  if(userobj.password=='')
  return alert('同志，请出示密码！');

  post_api('user/login',userobj,function(err,back){
    geid('error_info').innerHTML = back;
    display('error_info_panel')
    if(err){
      geid('password').focus();
      return;
    }
    //else
    //successfully logged in
    //alert(back);
    location.href = document.referrer; //go back in history
  });
}

function username_keypress(){
  e = event ? event :(window.event ? window.event : null);
  if(e.keyCode===13||e.which===13)
  geid('password').focus();
}

function password_keypress(){
  e = event ? event :(window.event ? window.event : null);
  if(e.keyCode===13||e.which===13)
  login_submit();
}

geid('username').focus();

function login_submit(){
  var userobj={
    username : gv('username'),
    password : gv('password'),
  }

  if(userobj.username=='')
  return alert('我在门口捡到了你的用户名，下次不要忘了');
  if(userobj.password=='')
  return alert('我在门口捡到了你的密码，下次不要忘了');

  nkcAPI('userLogin',userobj)
  .then(res=>{
    geid('error_info').innerHTML = JSON.stringify(res);
    display('error_info_panel')

    if(
      document.referrer.toString().indexOf('register')>=0 ||
      document.referrer.toString().indexOf('logout')>=0
    )
    location.href = '/'; //dont go back to register form
    else
    location.href = document.referrer; //go back in history
  })
  .catch(err=>{
    geid('error_info').innerHTML = JSON.stringify(err);
    display('error_info_panel')
    geid('password').focus();
  })
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

function register_submit(){
  var userobj={
    username : gv('username'),
    password : gv('password'),
    password2 : gv('password2'),
  }

  //client side validation
  if(userobj.password2!==userobj.password){
    alert('两遍密码不一致。')
    return;
  }

  var result = nkc_validate_fields(userobj);
  if(result){
    alert('项 “'+result.toString()+'” 的值不符合要求，请修改。');
  }else{
    //alert('allright');
    post_api('user',userobj,function(err,back){
      if(err){alert(back);return;}
      //else
      alert(back);
    });
  }
}

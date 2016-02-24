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

  var result = nkc_validate(userobj);
  if(result){
    alert('项 '+result.toString()+' 的值不符合规定，请修改。');
  }else{
    alert('allright');
  }

}

//return false if no violation, otherwise return first violating field.
function nkc_validate(input){
  //input is an object of fields awaiting validation.
  for(i in nkc_validate_rules){
    if(input[i]!==undefined&&input[i]!==null) //if field exists
    if(nkc_validate_rules[i].test(input[i])==false)
    return i.toString();
  }
  return false;
}

var nkc_validate_rules={
  username: /^[A-Za-z0-9\-\_\u4e00-\u9fa5]{2,16}$/,
  //中文，大小写字母，2到16个字
  password: /^[A-Za-z0-9\_\-]{6,20}$/,

}

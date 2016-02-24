var nkc_validate_rules={
  username: /^[A-Za-z0-9\-\_\u4e00-\u9fa5]{2,16}$/,
  //中文，大小写字母，2到16个字
  password: /^[A-Za-z0-9\_\-]{6,20}$/,
}

//return false if no violation, otherwise return first violating field.
function nkc_validate_fields(input){
  //input is an object of fields awaiting validation.
  for(i in nkc_validate_rules){
    if(input[i]!==undefined&&input[i]!==null) //if field exists
    if(nkc_validate_rules[i].test(input[i])==false)
    return i.toString();
  }
  return false;
}


if(typeof document !== 'undefined'){
  //browser mode
}else{
  exports.rules = nkc_validate_rules;
  exports.validate = nkc_validate_fields;
}

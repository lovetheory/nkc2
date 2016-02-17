function uploadfile(){

  var formData = new FormData();
  formData.append('file', geid('uf').files[0]);
  var target = 'resources';
  post_upload(target,formData,function(err,back){
    if(err){
      alert('not 200 failure: '+back);
    }else{
      brrr=JSON.parse(back);
      if(brrr.rid){
        //if redirection instruction exists
        alert(brrr.rid);
      }else {
        alert(back);
      }
    }
  });
}

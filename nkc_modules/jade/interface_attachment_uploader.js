var attachment_uploader = function(options){
  var uploader = {};
  //multi-part uploader.
  //data should be a FormData object
  post_upload = function(target,data,callback)
  {
    var xhr = new XMLHttpRequest();

    xhr.upload.onprogress = function(e) {
      var percentComplete = (e.loaded / e.total) * 100;
      console.log("Uploaded " + percentComplete + "%");
      options.percentage_callback(percentComplete);
    };

    xhr.onreadystatechange=function()
    {
      if (xhr.readyState==4)
      {
        if(xhr.status>=200&&xhr.status<300){
          callback(null,xhr.responseText);
        }else {
          callback(xhr.status.toString()+' '+xhr.responseText);
        }
      }
    }
    xhr.open("POST","/api/"+target.toString().toLowerCase(),true);
    //xhr.setRequestHeader("Content-type","application/json");
    xhr.send(data);
  };

  uploader.files_left = 0;

  files_left_incr = function(){
    uploader.files_left += 1;
    options.files_left_callback(uploader.files_left);
  }

  files_left_decr = function(){
    uploader.files_left -= 1;
    options.files_left_callback(uploader.files_left);
  }

  create_upload = function (data){
    files_left_incr();
    post_upload(options.upload_target, data , function(err,back){
      files_left_decr();
      if(err){
        options.upload_failed_callback(err);
      }else{
        options.upload_success_callback(back);
      }
    });
  }

  //on click of the upload button
  uploader.uploadfile_click = function(){
    var items = geid('file-selector').files;
    if(items.length==0)return alert('至少选一个呗');
    if(items.length>10) return alert('尼玛一次上传那么多，服务器根本受不了');

    for(i in items){
      if(!items[i].size)break;

      var formData = new FormData();
      formData.append('file', items[i]);
      create_upload(formData);
    }

    geid('file-selector').value = '';
  };

  //When paste happens
  uploader.paste_handler = function(e) {
    var items = e.clipboardData.items;
    if(items.length>4)return alert('一次不要那么多文件。暂时先这样。');

    for(i in items){
      console.log("Item: " + items[i].type);
      if (items[i].type.indexOf('image')==0) //if is image
      {
        var formData = new FormData();
        formData.append('file', items[i].getAsFile());
        create_upload(formData);
      }
      else {
        console.log("Discarding paste data: "+items[i].type);
      }
    }
  };

  return uploader;
}

var uploader = attachment_uploader({
  ////server/api/path-to-upload
  upload_target:ga('file-uploading','target'),

  upload_success_callback:function(info){
    //refresh list if possible
    if(list)list.refresh();
  },

  upload_failed_callback:function(info){
    alert('failed. \n'+info);
  },

  files_left_callback:function(num){
    if(num>0){
      geid('upload-counter').innerHTML = num.toString()+' file(s) left...';
    }else{
      geid('upload-counter').innerHTML = 'no files uploading.';
    }
  },

  percentage_callback:function(pctg){
    geid('upload-percentage').innerHTML = pctg.toString()+'%';
  }
});

//enable Ctrl + V paste
geid("paste-target").addEventListener("paste", uploader.paste_handler);

//enable click
geid('upload-button').addEventListener('click', uploader.uploadfile_click);

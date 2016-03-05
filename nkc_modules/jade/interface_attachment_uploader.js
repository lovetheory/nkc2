//multi-part uploader.
//data should be a FormData object
function post_upload(target,data,callback)
{
  var xhr = new XMLHttpRequest();

  xhr.upload.onprogress = function(e) {
    var percentComplete = (e.loaded / e.total) * 100;
    console.log("Uploaded " + percentComplete + "%");
  };

  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      if(xhr.status>=200&&xhr.status<300){
        callback(null,xhr.responseText);
      }else {
        callback(true,xhr.status.toString()+' '+xhr.responseText);
      }
    }
  }
  xhr.open("POST","/api/"+target.toString().toLowerCase(),true);
  //xhr.setRequestHeader("Content-type","application/json");
  xhr.send(data);
}

//on click of the upload button
function uploadfile_click(){
  var items = geid('select-file').files;
  if(items.length==0)return alert('至少选一个呗');
  if(items.length>10) return alert('尼玛一次上传那么多，服务器根本受不了');

  for(i in items){
    if(!items[i].size)break;

    var formData = new FormData();
    formData.append('file', items[i]);
    create_upload(formData);
  }
}

//When paste happens
function paste_handler(e) {
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
}

var files_left = 0;
function files_left_incr(){files_left += 1;
  geid('number_counter').innerHTML = files_left.toString();
}
function files_left_decr(){files_left -= 1;
  geid('number_counter').innerHTML = files_left.toString();
}

function create_upload(data){
  files_left_incr();
  post_upload(upload_target, data , function(err,back){
    if(err){
      files_left_decr();
      alert('not 200 failure: '+back);
    }else{
      //do something important here!!
      files_left_decr();
      upload_success(back);
    }
  });
}

function upload_success(info){
  geid('print-result').innerHTML += info + '<br>';
}

window.onload = function() {
//enable Ctrl + V paste
geid("paste_target").addEventListener("paste", paste_handler);

//enable click
  geid('upload-selected').addEventListener('click', uploadfile_click);

  ////server/api/path-to-upload
  this.upload_target = ga('upload-file','target');
};

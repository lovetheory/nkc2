//helper
function geid(id){return document.getElementById(id);}
function gv(id){return geid(id).value;}
function ga(id,attr){return geid(id).getAttribute(attr);}
function hset(id,content){geid(id).innerHTML=content;}

function post_api(target,body,callback)
{
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      if(xhr.status==200){
        callback(null,xhr.responseText);
      }else {
        callback(true,xhr.status.toString()+' '+xhr.responseText);
      }
    }
  }
  xhr.open("POST","/api/"+target.toString().toLowerCase(),true);
  xhr.setRequestHeader("Content-type","application/json");
  xhr.send(JSON.stringify(body));
};

function post_upload(target,data,callback)
{
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      if(xhr.status==200){
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

function redirect(url){
  window.location=url;
}

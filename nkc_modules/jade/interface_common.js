//helper
function geid(id){return document.getElementById(id);}
function gv(id){return geid(id).value;}
function ga(id,attr){return geid(id).getAttribute(attr);}
function hset(id,content){geid(id).innerHTML=content;}
function display(id){geid(id).style = 'display:inherit;'}

function jalert(obj){
  if(screenTopAlert){
    screenTopAlert(JSON.stringify(obj))
  }
  else {
    alert(JSON.stringify(obj))
  }
}

function jwarning(obj){
  if(screenTopWarning){
    screenTopWarning(JSON.stringify(obj))
  }
  else {
    alert(JSON.stringify(obj))
  }
}

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
        callback(xhr.status.toString()+' '+xhr.responseText);
      }
    }
  }
  xhr.open("POST","/api/"+target.toString().toLowerCase(),true);
  xhr.setRequestHeader("Content-type","application/json");
  xhr.send(JSON.stringify(body));
};

function generalRequest(obj,opt,callback){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function(){
    if (xhr.readyState==4)
    {
      try{
        var res;
        res = JSON.parse(xhr.responseText);
        if(xhr.status==0||xhr.status>=400)throw res;
        if(res.error)throw res;

        callback(null,res);
      }catch(err){
        callback(err);
      }
    }
  }

  try{
    xhr.open(opt.method,opt.url,true);
    xhr.setRequestHeader("Content-type","application/json");
    xhr.send(JSON.stringify(obj));
  }catch(err){
    callback(err);
  }
}

function nkcOperationAPI(obj){
  return new Promise(function(resolve,reject){
    generalRequest(obj,{
      method:'POST',
      url:'/api/operation'
    },function(err,back){
      if(err)return reject(err);
      resolve(back);
    });
  })
}

function get_api(target,callback)
{
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      if(xhr.status>=200||xhr.status<400){
        callback(null,xhr.responseText);
      }else {
        callback(xhr.status.toString()+' '+xhr.responseText);
      }
    }
  }
  xhr.open("GET",target.toString().toLowerCase(),true);
  xhr.send();
};

function delete_api(target,callback)
{
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      if(xhr.status>=200||xhr.status<400){
        callback(null,xhr.responseText);
      }else {
        callback(xhr.status.toString()+' '+xhr.responseText);
      }
    }
  }
  xhr.open("DELETE",target.toString().toLowerCase(),true);
  xhr.send();
};

function screenTopAlert(text)
{
  return screenTopAlertOfStyle(text,'success')
}

function screenTopWarning(text)
{
  return screenTopAlertOfStyle(text,'warning')
}

var _alertcount = 0
function screenTopAlertOfStyle(text,stylestring){
  //rely on bootstrap styles

  var objtext = $('<div/>').text(text).html();
  _alertcount++;
  var itemID = 'alert' + _alertcount.toString()

  return new Promise(function(resolve,reject){
    $('#alertOverlay').append(
      '<div class="alert alert-'+ stylestring +'" id="' + itemID +
      '" role="alert" style="text-align:center;display:block; position:relative; top:0; width:100%; margin-bottom:3px">'
      + objtext +'</div>'
    );

    var selector = '#'+itemID

    setTimeout(function(){
      $(selector).fadeOut('slow',function(){
        $(selector).remove()
        resolve(selector)
      })
    },2000)
  })
}

function screenTopAlertInit(){
  $("body").prepend(
    '<div id="alertOverlay" style="z-index:9999; display:block; position:fixed; top:0; width:100%;">'
    +'</div>'
  );
}

screenTopAlertInit()

function redirect(url){
  window.location=url;
}

function nkcAPI(operationName,remainingParams){
  if(!remainingParams){
    var remainingParams={}
  }
  remainingParams.operation = operationName;
  return nkcOperationAPI(remainingParams)
}

var NavBarSearch = {
  box:geid('SearchBox'),
  btn:geid('SearchButton'),

  init:function(){
    console.log('NavBarSearch init...');
    NavBarSearch.btn.addEventListener('click',NavBarSearch.search);

    NavBarSearch.box.addEventListener('keypress', NavBarSearch.onkeypress);

  },

  onkeypress:function(){
    e = event ? event :(window.event ? window.event : null);
    if(e.keyCode===13||e.which===13)

    NavBarSearch.search()
  },

  search:function(){
    var searchstr = NavBarSearch.box.value.trim()
    nkcAPI('useSearch',{searchstring:searchstr});

//    https://www.google.com.hk/search?newwindow=1&safe=strict&source=hp&q=zvs+site%3Abbs.kechuang.org
    window.location =
    'https://www.google.com.hk/search?newwindow=1&safe=strict&source=hp&q='
    +encodeURI(searchstr)
    +'+site%3Abbs.kechuang.org'
  },
};

NavBarSearch.init()



//in memory of alex king
// JS QuickTags version 1.3.1
//
// Copyright (c) 2002-2008 Alex King
// http://alexking.org/projects/js-quicktags
function edInsertContent(which, myValue) {
  myField = document.getElementById(which);

  //MOZILLA/NETSCAPE support
  if (myField.selectionStart || myField.selectionStart == '0') {
    var startPos = myField.selectionStart;
    var endPos = myField.selectionEnd;
    var scrollTop = myField.scrollTop;
    myField.value = myField.value.substring(0, startPos)
    + myValue
    + myField.value.substring(endPos, myField.value.length);
    //myField.focus();

    myField.selectionStart = startPos + myValue.length;
    myField.selectionEnd = startPos + myValue.length;
    myField.scrollTop = scrollTop;
  }
  //IE support
  else if (document.selection) {
    myField.focus();
    sel = document.selection.createRange();
    sel.text = myValue;
    myField.focus();
  }
  else
  {
    myField.value += myValue;
    //myField.focus();
  }
}

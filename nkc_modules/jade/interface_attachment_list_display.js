var list_display = function(options){
  var list_display = {};

  //init of attachment list display.
  var list_template = geid('list-template').innerHTML;
  var list_father = geid('list-container');
  var datasource = ga('list-container','datasource');

  list_father.innerHTML = '';//clear

  function html_replace(html,obj){
    for(i in obj){
      html = html.replace(new RegExp('{{'+i+'}}','g'),obj[i]);
    }
    return html;
  }

  list_display.rlist = [];

  list_display.refresh = function(){

    //obtain rlist here
    get_api(datasource + '?count=20',function(err,back){
      if(err)return alert(err);
      try{
        list_display.rlist = JSON.parse(back);
      }
      catch(e){return alert(e);}  //console.log(rlist);

      if(Array.isArray(list_display.rlist)==false){
        //because on error the api returns an json object,
        list_display.rlist=[];return;
      }

      list_father.innerHTML = '';
      for(i in list_display.rlist){
        //var isImage = ['image/jpeg','image/png','image/gif','image/svg+xml'].indexOf(rlist[i].mime)>=0;

        list_father.innerHTML += html_replace(list_template,{
          linksrc://isImage?
          'javascript:content_insert_resource('+ i +')'
          //:'javascript:content_insert_resource_thumbnail(\''+rlist[i]._key+'\',\''+rlist[i].oname+'\')'
          ,

          imgsrc:'/rt/' + list_display.rlist[i]._key, //thumbnail
          description: list_display.rlist[i].oname,
        });
      }
    });
  }

  return list_display;
}

var list = list_display();

list.refresh();

function content_insert_resource(index)
{
  var robject=list.rlist[index];

  edInsertContent('content','%{r='+robject._key+'\\'+robject.mime+'\\'+robject.oname + '\/}\n');
  editor.update();
}

function content_insert_resource_thumbnail(index,oname)
{
  edInsertContent('content','[rt=' + index.toString() + ']['+oname.toString()+'/]\n\n');
  editor.update();
}

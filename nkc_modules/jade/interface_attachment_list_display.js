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

  var testdata = []

  list_display.refresh = function(){

    //obtain testdata here
    get_api(datasource + '?count=20',function(err,back){
      if(err)return alert(err);
      try{
        testdata = JSON.parse(back);
      }
      catch(e){return alert(e);}  //console.log(testdata);

      list_father.innerHTML = '';
      for(i in testdata){
        list_father.innerHTML += html_replace(list_template,{
          linksrc:'javascript:text_insert('+testdata[i]._key+')', //original
          imgsrc:'/rt/' + testdata[i]._key, //thumbnail
          description:testdata[i].oname,
        });
      }
    });
  }

  return list_display;
}

var list = list_display();

list.refresh();

function text_insert(index)
{
  edInsertContent('content','![](/r/' + index.toString() + ') ')
}

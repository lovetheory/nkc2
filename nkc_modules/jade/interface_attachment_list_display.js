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
        var isImage = testdata[i].mime.indexOf('image')==0;

        list_father.innerHTML += html_replace(list_template,{
          linksrc:isImage?
          'javascript:content_insert_resource(`'+testdata[i]._key+'`)'
          :'javascript:content_insert_resource_thumbnail(`'+testdata[i]._key+'`,`'+testdata[i].oname+'`)'
          ,

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

function content_insert_resource(index)
{
  edInsertContent('content','[r=' + index.toString() + ']\n\n');
}

function content_insert_resource_thumbnail(index,oname)
{
  edInsertContent('content','[rt=' + index.toString() + ']['+oname.toString()+'/]\n\n');
}

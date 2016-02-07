function post(target,body)
{
  var xhr = new XMLHttpRequest();

  xhr.onreadystatechange=function()
  {
    if (xhr.readyState==4)
    {
      alert(xhr.status+xhr.responseText);
    }
  }

  xhr.open("POST","/api/"+target.toString().toLowerCase(),true);
  xhr.setRequestHeader("Content-type","application/json");
  xhr.send(JSON.stringify(body));
};

var ife = new Vue({
  el: '#ife',
  //element
  data: {
    title:  'test title',
    content: 'test content',
    to:'thread/34',
    lang:'Markdown',
  },
  //databinding

  filters: {
    marked: marked
  },

  methods:
  {
    post:function(){
      var body={
        t:this.title,
        c:this.content,
        l:this.lang.toLowerCase(),
      };
      post(this.to,body);
    },
  }
});

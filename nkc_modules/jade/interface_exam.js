
function submit(){
  var sheet = [];
  for(var i=0;i<6;i++)
  {
    var choice = geid('answer'+i.toString()).value;
    sheet.push(choice);
  }

  var exam = JSON.parse(decodeURI(ga('exam','exam-object')));

  var examobj={
    exam:exam,
    sheet:sheet,
  }

  console.log(examobj);
  post_api('exam',examobj,function(err,back){
    if(err){
      alert(err);
      window.location = '/interface/exam?result=fail';
      return;
    }
      back = JSON.parse(back);
      alert(back.token)
      window.location = '/interface/exam?result='+back.token;
  })
}

if(geid('submit'))geid('submit').addEventListener('click',submit);


function submit(){
  var sheet = [];
  var number_of_questions = ga('number_of_questions','value');

  for(var i=0;i<number_of_questions;i++)
  {
    var choice = geid('answer'+i.toString()).value;
    sheet.push(choice);
  }

  var exam = JSON.parse(decodeURI(ga('exam','exam-object')));

  var examobj={
    exam,
    sheet,
  }

  console.log(examobj);
  return nkcAPI('submitExam',examobj)
  .then(function(result){
    window.location = '/exam?result=' + result.token
  })
  .catch(function(err){
    window.location = '/exam?result=fail&detail=' + encodeURI(JSON.stringify(err))
  })
}

if(geid('submit'))geid('submit').addEventListener('click',submit);

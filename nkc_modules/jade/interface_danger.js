var DangerEditor = {
  inputid:geid('DocID'),
  inputcontent:geid('DocJSON'),

  btnload:geid('LoadDoc'),
  btnsubmit:geid('SaveDoc'),
  btnLoadFromUsername:geid('LoadDocAsUsername'),

  init:function(){
    console.log('Danger init...');
    DangerEditor.btnload.addEventListener('click',DangerEditor.load);
    DangerEditor.btnLoadFromUsername.addEventListener('click',DangerEditor.loadFromUsername);

    DangerEditor.btnsubmit.addEventListener('click',DangerEditor.submit);
    DangerEditor.inputid.addEventListener('keypress', DangerEditor.onkeypress);
  },

  load:function(){
    window.location = '/danger?id=' + DangerEditor.inputid.value.trim()
  },

  loadFromUsername:function(){
    window.location = '/danger?username=' +　DangerEditor.inputid.value.trim()
  },

  submit:function(){
    try{
      var doc = JSON.parse(DangerEditor.inputcontent.value)
    }catch(e){
      screenTopWarning(e.toString())
      return
    }

    nkcAPI('dangerouslyReplaceDoc',{doc:doc})
    .then(jalert)
    .catch(screenTopWarning)
  },

  onkeypress:function(){
    e = event ? event :(window.event ? window.event : null);
    if(e.keyCode===13||e.which===13)

    DangerEditor.submit()
  },
}

DangerEditor.init()

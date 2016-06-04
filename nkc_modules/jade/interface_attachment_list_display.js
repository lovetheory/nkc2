var ResourceListItem = React.createClass({
  click:function(event){
    event.index = this.props.index;
    event.rid = this.props.robject._key
    this.props.click(event);
  },
  render:function(){
    var robject = this.props.robject;
    var rid = robject._key
    var oname = robject.oname

    return (
      <div className="ResourceListItem" onClick={this.click}>
        <img className="ResourceListItemThumb" src={'/rt/'+rid}></img>
        <div className="ResourceListItemText">{oname}</div>
      </div>
    )
  }
})

var ResourceList = React.createClass({
  render:function(){
    var list = this.props.list
    var renderedNodes = []
    for(i in list){
      var robject = list[i]

      renderedNodes.push(
        <ResourceListItem click={this.props.itemclick} key={robject._key} index={i} robject={robject}/>
      )
    }
    return(
      <div className="ResourceList">
        {renderedNodes}
      </div>
    )
  }
})

var list_display = function(options){
  var list_display = {};

  //init of attachment list display.
  var list_father = geid('list-container');

  list_father.innerHTML = '';//clear
  list_display.rlist = [];

  list_display.refresh = function(){
    //obtain rlist here
    nkcAPI('getResourceOfCurrentUser',{})
    .then(rarr=>{
      list_display.rlist = rarr;
      React.render(
        <ResourceList itemclick={content_insert_resource} list={rarr}/>,
        list_father
      );
    })
    .catch(jalert)
  }

  return list_display;
}

var list = list_display();
list.refresh();

function content_insert_resource(event)
{
  edInsertContent('content','#{r=' + event.rid + '}\n');
  editor.update();
}

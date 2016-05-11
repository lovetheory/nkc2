var ItemContainer = React.createClass({
  click:function(event){
    event.index = this.props.index;
    this.props.click(event);
  },
  render:function(){
    var item = this.props.item;
    var index = this.props.index;
    var ItemClass = this.props.itemclass;

    return (
      <div className={'ItemContainer '+(item.selected?'ItemContainerSelected':'')} onClick={this.click}>
        <ItemClass index={index} item={item}/>
      </div>
    )
  }
})

var MyList = React.createClass({
  render:function(){
    var list = this.props.list
    var renderedNodes = []
    for(i in list){
      renderedNodes.push(
        <ItemContainer click={this.props.itemclick} key={i} index={i} item={list[i]} itemclass={this.props.itemclass}/>
      )
    }

    return(
      <div className="MyList">
        {renderedNodes}
      </div>
    )
  }
})

var MyButton = React.createClass({
  click:function(){
    this.props.button.action()
  },
  render:function(){
    var button = this.props.button
    return(
      <button className="MyButton btn btn-default" onClick={this.click}>{button.text}</button>
    )
  }
})

var ButtonList = React.createClass({
  render:function(){
    var buttons = this.props.buttons
    var renderedNodes = []
    for(i in buttons){
      renderedNodes.push(<MyButton key={i} button={buttons[i]}/>)
    }
    return(
      <div className="ButtonList">
        {renderedNodes}
      </div>
    )
  }
})

var ListControl = React.createClass({
  render:function(){
    var pc = this.props.pc
    return(
      <div className="ListControl">
        <h4>{pc.title}</h4>
        <MyList list={pc.list} itemclick={pc.itemclick} itemclass={pc.itemclass}/>
        <ButtonList buttons={pc.buttons}/>
      </div>
    )
  }
})

function InitThreadControl(options){

  function render(){
    React.render(
      <ListControl pc={pc}/>,
      options.rootnode
    );
  };

  function yell(err){
    return alert(err.toString());
  }

  var pc =
  {
    title:'帖楼管理',
    buttons:{
      refresh:{
        text:'获取管理车',
        action:function(){
          return nkcAPI('listCart')
          .then((result)=>{
            pc.list = result
            logme('已获取管理车：共 '+result.length+' 项')
          })
          .then(render)
          .catch(logme)
        },
      },
      selectAll:{
        text:'全选/反选',
        action:function(){
          for(i in pc.list){
            pc.list[i].selected = !pc.list[i].selected;
          }
          render()
        },
      },

      deselectAll:{
        text:'全不选',
        action:function(){
          for(i in pc.list){
            pc.list[i].selected = false;
          }
          render()
        },
      },

      clear:{
        text:'清除选中的',
        action:function(){
          var newlist = []
          for(i in pc.list){
            if(!pc.list[i].selected)newlist.push(pc.list[i])
          }
          pc.list = newlist;
          render()
        },
      },

      clearCart:{
        text:'清除服务器端',
        action:function(){
          nkcAPI('clearCart')
          .then(pc.actions.refresh)
          .then(()=>{
            logme('服务器端管理车已清除')
          })
          .catch(logme)
        },
      },

      recycleSelectedThread:{
        text:'将选中帖子移动到回收站',
        action:function(){
          return moveSelectedThread('recycle')
          .then(count=>{
            if(count!=0){
              logme(count.toString()+' executed')
              pc.actions.refresh()
            }
          })
          .catch(logme)
        }
      },
    },

    list:[
    ],

    itemclass:React.createClass({
      render:function(){
        var item = this.props.item
        var type = item._id.split('/')[0];

        if(type=='threads')
        return(
          <div className="SomeItemDisplay">
            <div className="ItemTypeText">{type}</div>
            <div className="ItemMeta">id:{item._key} fid:{item.fid} uid:{item.oc.uid}</div>
            <div className="ItemText">{item.oc.t}</div>
          </div>
        )

        if(type=='posts')
        return(
          <div className="SomeItemDisplay">
            <div className="ItemTypeText">{type}</div>
            <div className="ItemMeta">id:{item._key} tid: {item.tid} uid:{item.uid}</div>
            <div className="ItemText">{item.t} - {item.c.slice(0,25)}</div>
          </div>
        )

      }
    }),

    itemclick:function(event){
      var index = event.index;
      pc.list[index].selected = !pc.list[index].selected
      //alert(index);
      render();
    },
  }

  pc.actions={};
  for(b in pc.buttons){
    pc.actions[b] = pc.buttons[b].action
  }
  pc.render = render;

  return pc;
}

var pc = InitThreadControl({
  rootnode:geid('Root'),
})

pc.render()
pc.actions.refresh();

function moveSelectedThread(fid){
  var p = Promise.resolve(0);
  var count = 0;
  for(i in pc.list){
    var item = pc.list[i]
    var type = item._id.split('/')[0];
    if(type=='threads'&&item.selected){
      count++;
      var tid = item._key
      p = p.then(()=>{
        return nkcAPI('moveThread',{tid,fid})
      })
      .then((result)=>{
        logme('thread '+tid+' moved to '+fid)
      })
    }
  }
  return p
  .then(()=>{
    return count;
  })
}


var loggerlist = []
function logme(tolog){
  loggerlist.push(JSON.stringify(tolog));
  loggerlist = loggerlist.slice(-20,20);

  var logtext = ''
  for(i in loggerlist){
    logtext+=loggerlist[i]+'\n'
  }

  geid('logger').innerHTML = logtext;
}

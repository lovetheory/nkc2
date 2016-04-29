var managementCart = new Vue({
  el:'#managementCart',
  data:{
    items:[
      {_id:1},
      {_id:2},
    ]
  },
  methods:{
    refresh:function(){
      nkcExperimentalAPI({
        operation:'testList',
      },function(err,result){
        if(err)return alert(err)
        managementCart.items = result.threads;
      })
    }
  }
})

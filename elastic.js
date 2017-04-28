require('./global_env')



var es = require('elasticsearch');
var client = new es.Client({
  host:'127.0.0.1:9200',
  //log:'trace'
})

var queryfunc = require('./nkc_modules/query_functions')
var AQL = queryfunc.AQL

var context ={}

var wait = (t)=>{
  return new Promise((resolve,reject)=>{
    setTimeout(resolve,t)
  })
}

context.wait = wait

context.setupIndex= ()=>{
  return client.indices.delete({index:'test'})
  .catch(console.error)
  .then(res=>{
    return client.indices.create({index:'test'})
  })
  .then(res=>{
    return client.indices.putMapping({
      index:'test',
      type:'threads',
      body:{
        threads:{ // post 字段
          properties:{
            _key:{
              type:'integer',
              analyzer:'smartcn',
            },
            c:{ //content 内容
              type:'string',
              analyzer:'smartcn',
            },
            t:{ //title 标题
              type:'string',
              analyzer:'smartcn',
            },
            username:{
              type:'keyword'
            },
            count:{
              type:'integer'
            },
            creditvalue:{
              type:'integer'
            }
          }
        }
      }
    })
  })
  .then(res=>{
    return queryfunc.createIndex('threads',{
      fields:['esi'],
      type:'hash'
    })
  })
  .then(res=>{
    return AQL(`for t in threads
      filter t.esi==true
      update t with {esi:null} in threads
      `
    )
  })
  .then(res=>{
    console.log('setup ended');
  })
  .catch(console.err)
}

function mapWithPromise(arr,func,k){
  return Promise.resolve()
  .then(()=>{
    k = k||0
    if((!arr.length)||(k>=arr.length)){
      console.log('mapping ended with',arr.length||0);
      return
    }else{
      console.log('run func on #'+k+' element');
      return Promise.resolve()
      .then(()=>{
        return func(arr[k])
      })
      .then(()=>{
        return mapWithPromise(arr,func,k+1)
      })
    }
  })
}



context.indexThread = (doc)=>{
  return client.index({
    index:'test',
    type:'threads',
    id:doc._id||doc._key||doc.id||'100',
    body:doc,
  })
}



context.search = (q)=>{
  return client.search({
    index:'test',
    type:'threads',
    q,
  })
  .then(res=>{
    console.log(res);
    var list = res.hits.hits
    list.map(li=>{
      console.log(li._score);
      console.log(li._source.t);
    })
  })
}



context.s = (k)=>{
  return context.searchAdvanced(k)
  .catch(console.error)
}




context.searchAdvanced =(q,start,count)=>{

  function simpleq(fieldname,msm,boost){
    return {
      simple_query_string:{
        fields:[fieldname],
        query:q,
        boost:boost||1,
        default_operator:'AND',
        minimum_should_match:msm||'25%',
      }
    }
  }

  var matchq = {
    match:{
      't':{
        query:q
      }
    }
  }

  var dismaxq = {
    dis_max:{
      tie_breaker:0.3,
      queries:[
        simpleq('t','50%',6),  //按标题
        simpleq('c','90%',1),  //按帖子内容
        simpleq('username','50%',2),  //按用户名
        simpleq('_key','50%',2),  //按文号
        {
          term:{
            username:q.split(' ')[0]
          }
        },
      ]
    }
  }

  return client.search({
    index:'test',
    type:'threads',
    body:{
      from:start||0,size:count||10,
      //min_score:1,

      //query:dismaxq,
      query:{
        function_score:{
          query:dismaxq,
          //query:matchq,
          score_mode:'sum',

          functions:[
            {
              field_value_factor:{
                field:'count',
                factor:0.03,
                modifier:'none',
                missing:0,
              },
            },
            {
              field_value_factor:{
                field:'creditvalue',
                factor:0.002,
                modifier:'none',
                missing:0,
              },
            },
            // {
            //   field_value_factor:{
            //     field:'kcb',
            //     factor:0.01,
            //     modifier:'sqrt',
            //     missing:0,
            //   },
            // },
          ],

          boost_mode:'sum',
        }
      },

      highlight:{
        //pre_tags:['<span class="ResultHighLight">'],
        pre_tags:['<span style="background-color:red;">'],
        post_tags:['</span>'],
        fields:{
          t:{},
          c:{},
          username:{}
        }
      }
    }
  })
  .then(res=>{
    if(development){
      console.log(res);
      var list = res.hits.hits
      list.map(li=>{
        console.log(li._score);
        console.log(li._source.t,li._source.count,li._source.creditvalue);
      })
    }
    //console.log(res)
    return res
  })
}





context.batchIndex = ()=>{
  console.log('begin AQL');
  return AQL(`
    for t in threads
    filter t.esi!=true
    limit 500
    update t with {esi:true} in threads
	  return NEW
    `
  )
  .then(res=>{ //158发展专区，recycle回收站
	return AQL(`
		for t in @res
		filter t.fid!='158' && t.fid!='recycle'
		let p = merge(document(posts,t.oc),{
			count:t.count
		})
		return unset(p,['_id'])
	`,{res}
	)
  })
  .then(res=>{
    console.log('got AQL resp',res.length);
    var filtered = res.filter(doc=>(doc?true:false)).map(doc=>{
      if(doc.credits){
        doc.creditvalue =
         doc.credits.map(c=>{
		      c.q = Number(c.q)
          return (c.type=='xsf')?c.q*5000:c.q
        })
        .reduce((a,b)=>a+b,0)
      }

	    doc.r = undefined
	    doc.credits = undefined
      return doc
    })
    console.log('AQL got:',filtered.length);
	  console.log(filtered[0]);
    return mapWithPromise(filtered,context.indexThread)
  })
  .catch(err=>{
	console.error(err)
	throw err
  })
}





var isIndexing = true

context.enableIndexing = ()=>{
  isIndexing = true
  return context.keepIndexing()
}

context.keepIndexing = ()=>{
  return context.batchIndex()
  .then(res=>{
    return wait(1000)
  })
  .then(()=>{
    if(isIndexing){
      return context.keepIndexing()
    } else {
      return
    }
  })
  .catch(err=>{
    stopIndexing()
    console.log('error detected, stop indexing');
    console.log(err);
  })
}

context.stopIndexing = ()=>{
  isIndexing = false
}

module.exports = context

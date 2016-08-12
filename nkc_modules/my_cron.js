module.paths.push('./nkc_modules'); //enable require-ment for this path

var mycron = {}

mycron.startAllJobs = ()=>{
  var cron = require('node-cron')
  var queryfunc = require('query_functions')
var AQL = queryfunc.AQL

  cron.schedule('0 0 0 * * *',()=>{

    AQL(`for i in forums update i with {count_posts_today:0} in forums`)
    .then(res=>{
      console.log('midnight task run');
    })
  })

  cron.schedule('*/20 * * * *',function(){
    setTimeout(function(){
      process.exit()
    }
    ,1000)
    console.log('sched restart at',Date.now());
  })

}

module.exports = mycron

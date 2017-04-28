var table = {};
module.exports = table;


var moment = require('moment') //packages you may need
var fs = require('fs.extra')
var settings = require('../server_settings.js');
var helper_mod = require('../helper.js')();
var queryfunc = require('../query_functions')
var AQL = queryfunc.AQL

var layer = require('../layer')


table.getGalleryRecent = {
  operation:function(params) {
    if (params.target === 'home') {
      return AQL(`
        FOR t IN threads
          FILTER t.fid != 'recycle' && t.fid != '97' && t.disable != true
          SORT t.toc DESC
          LET p = DOCUMENT(posts, t.oc)
          FILTER p.r && LENGTH(p.r)
          LET parr = (
            FOR r IN p.r
              LET res = DOCUMENT(resources, r)
              FILTER POSITION(['jpg','png','svg','jpeg'], res.ext, false)
              RETURN res
          )
          FILTER LENGTH(parr)
          LET user = DOCUMENT(users, t.uid)
          LET forum = DOCUMENT(forums, t.fid)
          FILTER forum.visibility == true
          LIMIT 50
          RETURN {
            r: parr[RAND() * LENGTH(parr)],
            forum,
            thread: MERGE(t, {oc: p, ocuser: user})
          }
      `)
        .then(arr => {
          let rand = function() {
            return Math.floor(Math.random() * 50)
          };
          let randArr = [rand(),rand(),rand(),rand(),rand(),rand()];
          let temp = [];
          randArr.map(ele => {
            temp.push(arr[ele])
          });
          arr = temp;
          var promarr = []
          var resarr = []

          for (i of arr) {

            var t = new layer.Thread(i.thread._key)
            t.model = i.thread
            t.i = i

            var prom = t.load()
              .then(t => {
                return t.testView(Object.assign(params.contentClasses, {sensitive: true, non_broadcast: undefined}))
              })
              .then(t => {
                resarr.push(t.i)
              })
              .catch(err => {

              })
            promarr.push(prom)
          }

          return Promise.all(promarr)
            .then(() => {
              return resarr
            })
        })
        .then(arr => {
          //console.log(arr);
          return arr
        })
    }
    return AQL(`
      RETURN DOCUMENT(forums, @target)
    `)
      .then(res => {
        if (res.type === 'forum') {
          return AQL(`
            FOR t IN threads
            FILTER t.disable == null && t.fid == @target
            SORT t.toc DESC
            LET p = DOCUMENT(posts, t.oc)
            FILTER p.r && LENGTH(p.r)
            LET parr = (
              FOR r IN p.r
            LET res = DOCUMENT(resources, r)
            FILTER POSITION(['jpg','png','svg','jpeg'], res.ext, false)
            RETURN res
            )
            FILTER LENGTH(parr)
            LET user = DOCUMENT(users, t.uid)
            LET forum = DOCUMENT(forums, t.fid)
            FILTER forum.visibility == true
            LIMIT 6
            RETURN {
              r: parr[RAND() * LENGTH(parr)],
                forum,
                thread: MERGE(t, {oc: p, ocuser: user})
            }
            `, {target: params.target})
            .then(arr => {
              var promarr = []
              var resarr = []

              for (i of arr) {

                var t = new layer.Thread(i.thread._key)
                t.model = i.thread
                t.i = i

                var prom = t.load()
                  .then(t => {
                    return t.testView(Object.assign(params.contentClasses, {sensitive: true, non_broadcast: undefined}))
                  })
                  .then(t => {
                    resarr.push(t.i)
                  })
                  .catch(err => {

                  })
                promarr.push(prom)
              }

              return Promise.all(promarr)
                .then(() => {
                  return resarr
                })
            })
            .then(arr => {
              //console.log(arr);
              return arr
            })
        }
        return AQL(`
          FOR t IN threads
            FILTER t.disable == null && t.fid == @target
            SORT t.toc DESC
            LET p = DOCUMENT(posts, t.oc)
            FILTER p.r && LENGTH(p.r)
            LET parr = (
              FOR r IN p.r
            LET res = DOCUMENT(resources, r)
            FILTER POSITION(['jpg','png','svg','jpeg'], res.ext, false)
            RETURN res
            )
            FILTER LENGTH(parr)
            LET user = DOCUMENT(users, t.uid)
            LET forum = DOCUMENT(forums, t.fid)
            FILTER forum.visibility == true
            LIMIT 6
            RETURN {
              r: parr[RAND() * LENGTH(parr)],
                forum,
                thread: MERGE(t, {oc: p, ocuser: user})
            }
        `)
      })
  }
}

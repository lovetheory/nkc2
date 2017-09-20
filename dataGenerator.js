const arango = require('arangojs');
const aql = arango.aql;
const db = arango({
  url: 'http://root:@127.0.0.1:8529',
  databaseName: 'rescue',    //数据库名称
  arangoVersion: 20800
});

//05-18
/*
console.log('generating...');
console.log('creating collections...');

Promise.all([
  db.collection('invites').create(),
  db.collection('personalForums').create(),
  db.collection('usersSubscribe').create(),
  db.collection('usersBehavior').create()
])
  .then(() => console.log('done..'))
  .then(e => console.log(e));

let threadGen = db.query(aql`
  for t in threads
    update t with {
      mid: t.uid
    } in threads
  collect with count into length
  return {
    length,
    collection: 'threads'
  }
`);

let gen1 = db.query(aql`
  for p in posts
    let t = document(threads, p.tid)
    filter t.oc == p._key
    insert {
      uid: p.uid,
      fid: t.fid,
      time: p.tlm,
      tid: p.tid,
      pid: p._key,
      mid: t.mid,
      toMid: t.toMid,
      type: 1
  } into usersBehavior
  collect with count into length
  return {
    length,
    collection: 'usersBehavior'
  }
`);

let gen2 = db.query(aql`
  for p in posts
    let t = document(threads, p.tid)
    filter t.oc != p._key
    insert {
      uid: p.uid,
      fid: t.fid,
      time: p.tlm,
      tid: p.tid,
      pid: p._key,
      mid: t.mid,
      toMid: t.toMid,
      type: 2
  } into usersBehavior
  collect with count into length
  return {
    length,
    collection: 'usersBehavior'
  }
`);

let personalForumGen = db.query(aql`
  FOR u IN users
    INSERT {
      _key: u._key,
      type: 'forum',
      abbr: SUBSTRING(u.username, 0, 6),
      display_name: CONCAT(u.username, '的专栏'),
      description: CONCAT(u.username, '的专栏'),
      moderators: [u.username],
      recPosts: []
    } INTO personalForums
  collect with count into length
  return {
    length,
    collection: 'personalForums'
  }
`);

let usersSubscribeGen = db.query(aql`
  FOR u IN users
    INSERT {
      _key: u._key,
      subscribeForums: SPLIT(u.focus_forums, ','),
      subscribeUsers: []
    } IN usersSubscribe
  collect with count into length
  return {
    length,
    collection: 'usersSubscribe'
  }
`);

Promise.all([threadGen, gen1, gen2, personalForumGen, usersSubscribeGen])
  .then(res => {
    console.log('done!');
    return res.map(result => console.log(`共生成${result._result[0].length}条数据在${result._result[0].collection}`))
  })
 .catch(e => console.log(e));
*/

//5-25
db.query(aql`
  FOR f IN forums
    UPDATE f WITH {
      tCount: null
    } IN forums
`)
  .then(() => db.query(aql`
    FOR f IN forums  
      UPDATE f WITH {
        tCount: {
          normal: 0,
          digest: 0
        }
      } IN forums
  `))
  .then(() => db.query(aql`
    FOR f IN forums
      LET groups = (FOR t IN threads
        FILTER t.fid == f._key
        COLLECT digest = t.digest INTO group = t
        RETURN {
          digest,
          count: LENGTH(group)
        })
      FOR data IN groups
        FILTER data.digest
        UPDATE f WITH {
          tCount: {
            digest: data.count
          }
        } IN forums
  `))
  .then(() => db.query(aql`
    FOR f IN forums
      LET groups = (FOR t IN threads
        FILTER t.fid == f._key
        COLLECT digest = t.digest INTO group = t
        RETURN {
          digest,
          count: LENGTH(group)
        })
      FOR data IN groups
        FILTER !data.digest
        UPDATE f WITH {
          tCount: {
            normal: data.count
          }
        } IN forums  
  `))
  .catch(e => console.log(e));


/**
 * Created by lzszo on 2017/5/8.
 */


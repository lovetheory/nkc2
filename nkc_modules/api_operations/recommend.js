let arango = require('arangojs');
let aql = arango.aql;
let settings = require('../server_settings');
let db = arango(settings.arango);

let table = {};

table.recommendPost = {
  operation: params => {
    let user = params.user;
    let recPid = params.targetPid.toString();
    let time = Date.now();
    let post;
    return db.collection('posts').document(recPid)
      .then(doc => {
        post = doc;
        if(post.disabled) {
          throw '无法推荐已经被禁用的post'
        }
        return db.query(aql`
          UPSERT {_key: ${user._key}}
          INSERT {
            recs: [${recPid}],
            _key: ${user._key}
          }
          UPDATE {
            recPosts: PUSH(OLD.recPosts, ${recPid}, true)
          }
          INTO usersRecommend
        `)
      })
      .then(() => {
        return db.query(aql`
          LET thread = DOCUMENT(threads, ${post.tid})
          INSERT {
            uid: ${user._key},
            pid: ${recPid},
            fid: thread.fid,
            tid: thread._key,
            time: ${time},
            type: 4,
            toMid: thread.toMid,
            mid: thread.mid
          } INTO usersBehavior
        `)
      })
      .then(() => {
        return db.query(aql`
          LET post = DOCUMENT(posts, ${recPid})
          UPDATE post WITH {
            recUsers: PUSH(post.recUsers, ${user.username}, true)
          } IN posts
        `)
      })
      .catch(e => {throw e;})
  }
};

table.unrecommendPost = {
  operation: params => {
    let user = params.user;
    let unrecPid = params.targetPid.toString();
    let time = Date.now();
    let post;
    return db.collection('posts').document(unrecPid)
      .then(doc => {
        post = doc;
        return db.query(aql`
          LET obj = DOCUMENT(usersRecommend, ${user._key})
          UPDATE obj WITH {
            recPosts: REMOVE_VALUE(obj.recPosts, ${unrecPid})
          } IN usersRecommend
        `)
      })
      .then(() => {
        return db.query(aql`
          LET thread = DOCUMENT(threads, ${post.tid})
          INSERT {
            uid: ${user._key},
            pid: ${unrecPid},
            fid: thread.fid,
            tid: thread._key,
            time: ${time},
            type: 5,
            toMid: thread.toMid,
            mid: thread.mid
          } INTO usersBehavior
        `)
      })
      .then(() => {
        return db.query(aql`
          LET post = DOCUMENT(posts, ${unrecPid})
          UPDATE post WITH {
            recUsers: REMOVE_VALUE(post.recUsers, ${user.username})
          } IN posts
          RETURN LENGTH(NEW.recUsers)
        `)
      })
      .then(res => res._result[0])
      .catch(e => {throw e})
  }
};


module.exports = table;

/**
 * Created by lzszo on 2017/5/3.
 */

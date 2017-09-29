const queryFunc = require('../query_functions');
const aql = queryFunc.getAql();
const db = queryFunc.getDB();
const operationScoreHandler = require('../score_handler').operationScoreHandler;

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
          LET obj = DOCUMENT(personalForums, ${user._key})
          UPDATE obj WITH {
            recPosts: PUSH(obj.recPosts, ${recPid}, true)
          } IN personalForums
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
            recUsers: PUSH(post.recUsers, ${user._key}, true)
          } IN posts
        `)
      })
      .then(() => operationScoreHandler({
        address: params._req.iptrim,
        port: params._req.connection.remotePort,
        operation: 'recommendPost',
        from: params.user._key,
        to: post.uid,
        timeStamp: time,
        parameters: {
          targetKey: 't/' + post.tid,
          pid: post._key
        }
      }))
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
          LET obj = DOCUMENT(personalForums, ${user._key})
          UPDATE obj WITH {
            recPosts: REMOVE_VALUE(obj.recPosts, ${unrecPid})
          } IN personalForums
        `)
      })
      .then(() => operationScoreHandler({
        address: params._req.iptrim,
        port: params._req.connection.remotePort,
        operation: 'unrecommendPost',
        from: params.user._key,
        to: post.uid,
        timeStamp: time,
        parameters: {
          targetKey: 't/' + post.tid,
          pid: post._key
        }
      }))
      .then(() => {
        return db.query(aql`
          LET post = DOCUMENT(posts, ${unrecPid})
          UPDATE post WITH {
            recUsers: REMOVE_VALUE(post.recUsers, ${user._key})
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

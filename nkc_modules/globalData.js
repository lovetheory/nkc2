const queryFunc = require('./query_functions');
const db  = queryFunc.getDB();
const aql = queryFunc.getAql();

module.exports = function() {
  db.query(aql`
    LET normal = (FOR t IN threads
      FILTER t.fid == null
      COLLECT WITH COUNT INTO length
      RETURN length)[0]
      LET digest = (FOR t IN threads
      FILTER t.fid == null && t.digest == true
      COLLECT WITH COUNT INTO length
      RETURN length)[0]
      RETURN {digest, normal}
  `)
    .then(res => res._result[0])
    .then(count => {
      global.personalThreadsCount = count;
    })
    .catch(e => console.error(e.stack))
};

/**
 * Created by lzszo on 2017/5/19.
 */

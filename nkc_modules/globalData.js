const settings = require('./server_settings');
const arango = require('arangojs');
const db  = arango(settings.arango);
const aql = arango.aql;

module.exports = function() {
  db.query(aql`
    LET nCount = (FOR t IN threads
      FILTER t.disabled == null && t.fid != 'recycle'
      LET forum = DOCUMENT(forums, t.fid)
      FILTER forum.visibility == true
      COLLECT WITH COUNT INTO length
      RETURN length)[0]
      LET dCount = (FOR t IN threads
      FILTER t.disabled == null && t.digest == true && t.fid != 'recycle'
      LET forum = DOCUMENT(forums, t.fid)
      FILTER forum.visibility == true
      COLLECT WITH COUNT INTO length
      RETURN length)[0]
      RETURN {dCount, nCount}
  `)
    .then(res => res._result[0])
    .then(count => {
      global.allThreadsCount = count;
    })
    .catch(e => console.error(e.stack))
};

/**
 * Created by lzszo on 2017/5/19.
 */

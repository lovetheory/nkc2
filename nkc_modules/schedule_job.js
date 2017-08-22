const schedule = require('node-schedule');
const scheduleJob = schedule.scheduleJob;
const queryFunc = require('./query_functions');
const db = queryFunc.getDB();
const aql = queryFunc.getAql();
const settings = require('./server_settings');

const updateActiveUsers = cronStr => {
  scheduleJob(cronStr, () => {
    console.log('now updating the activeusers collection...')
    let threadCount = []; //counter of threads that user posted last week
    let postCount = []; //u know it
    const aWeekAgo = Date.now() - 604800000;
    db.query(aql`
      FOR p IN posts
      FILTER p.toc > ${aWeekAgo} && p.disabled == null
        LET t = DOCUMENT(threads, p.tid)
        FILTER t.oc == p._key && t.fid != 'recycle'
        COLLECT uid = p.uid INTO g
        LET xsf = DOCUMENT(users, uid).xsf
        RETURN {
        uid,
        xsf,
        tl: LENGTH(g)
      }
    `)
      .then(cursor => cursor.all())
      .then(groups => {
        threadCount = groups;
        return db.query(aql`
          FOR p IN posts
          FILTER p.toc > ${aWeekAgo} && p.disabled == null
            LET t = DOCUMENT(threads, p.tid)
            FILTER t.oc < p._key && t.fid != 'recycle'
            COLLECT uid = p.uid INTO g
            LET xsf = DOCUMENT(users, uid).xsf
            RETURN {
            uid,
            xsf,
            pl: LENGTH(g)
          }
        `)
      })
      .then(cursor => cursor.all())
      .then(groups => {
        postCount = groups;
        const counter = {};
        const arr = [];
        for(const u of threadCount) {
          counter[u.uid] = {
            lWThreadCount: u.tl,
            lWPostCount: 0,
            xsf: u.xsf || 0
          }
        }
        for(const u of postCount) {
          if(counter.hasOwnProperty(u.uid)) {
            counter[u.uid].lWPostCount = u.pl;
          }
          else {
            counter[u.uid] = {
              lWThreadCount: 0,
              lWPostCount: u.pl,
              xsf: u.xsf || 0
            }
          }
        }
        const vitalityArithmetic = settings.user.vitalityArithmetic;
        for(const key in counter) {
          const u = counter[key];
          u.vitality = vitalityArithmetic(u.lWThreadCount, u.lWPostCount, u.xsf);
          arr.push({
            uid: key,
            lWPostCount: u.lWPostCount,
            lWThreadCount: u.lWThreadCount,
            vitality: u.vitality
          })
        }
        db.collection('activeusers').truncate()
          .then(() => db.collection('activeusers').import(arr))
      })
      .catch(e => {
        throw e
      })
  });
};

module.exports = {
  updateActiveUsers
};
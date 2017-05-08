/**
 * Created by lzszo on 2017/5/8.
 */

for p in histories
  let t = document(threads, p.tid)
filter p.uidlm != null
insert {
  uid: p.uidlm,
    fid: t.fid,
    time: p.tlm,
    tid: p.tid,
    pid: p._key,
    mid: t.mid,
    toMid: t.toMid,
    type: 3
} into usersBehavior
collect with count into length
return length
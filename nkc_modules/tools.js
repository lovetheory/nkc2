/**
 * Created by lzszo on 2017/5/2.
 */
module.exports = {
  contentFilter: content => content.replace(/\[quote=.*][\s\S]+\[\/quote]/g, '')
};
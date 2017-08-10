/**
 * Created by lzszo on 2017/5/2.
 */
module.exports = {
  contentFilter: content => content.replace(/\[quote=.*][\s\S]+\[\/quote]/g, ''),
  contentLength: content => {
    const zhCN = content.match(/[^\x00-\xff]/g);
    const other = content.match(/[\x00-\xff]/g);
    const length1 = zhCN? zhCN.length * 2 : 0;
    const length2 = other? other.length : 0;
    return length1 + length2
  }
};
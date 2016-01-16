## GET /posts/:pid
获取楼。
从posts数据库中获取pid文档并返回给用户。

## PUT /posts/:pid
修改楼。
将pid楼原文放入h属性数组内，
随后将pid楼之content替换，
并更新tlm属性。

## POST /posts/
创建自由楼。暂无实现

## POST /thread/:tid
{
  content:'sth'
}
回帖。
首先从数据库请求一个新的pid，
然后创建一个新文档：
{
  id:pid
  tid:tid, //从属的tid
  content:'sth'
  toc:toc
}
并将其插入数据库。
随后更新数据库中tid帖之tlm属性。
最后返回操作状态。

## POST /forum/:fid
{
  content:'sth'
}
发布新帖。
首先从数据库请求一个新的tid，和一个新的pid。
然后创建一个新文档：
{
  id:tid,
  fid:fid,
  toc:toc,
  tlm:tlm,
}
并将其插入threads数据库。
然后创建一个新文档：
{
  id:pid,
  tid:tid, //从属的tid
  content:'sth',
  toc:toc,
}
并将其插入posts数据库。
返回操作状态。

## GET /thread/:tid?page=n
获取帖。
从posts数据库中获取tid相符的、发布时间排序的前50个帖子，
从第n*50个帖子开始（默认n=0）。

## PUT /thread/:tid
{
  changed:content,
}
修改帖。将tid帖原文放入h属性数组内，
随后将tid之若干属性按提交文档作更改。

## GET /forum/all/:fid?page=n
获取发布序的帖列表。
从thread数据库中获取fid相符的、按创建时间toc排序的帖子列表。

## GET /forum/:fid?page=n
获取回复序的贴列表。
从thread数据库中获取fid相符的、按回复时间tlm排序的帖子列表。

## PUT /thread/move?tid=n&&fid=k
移动帖子。
将tid帖子的fid属性更改为k。

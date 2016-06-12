//query functions
//equivalent ORM-Layer
module.paths.push('./nkc_modules'); //enable require-ment for this path

var settings = require('server_settings.js');
var helper_mod = require('helper.js')();
var queryfunc = require('query_functions')
var apifunc = require('api_functions')
var validation = require('validation')
var AQL = queryfunc.AQL

var layer = (function(){
  'use strict';

  var db = require('arangojs')(settings.arango.address);
  db.useDatabase(settings.server.database_name);

  var layer = {}

  var BaseDao = require('./BaseDao')

  class User extends BaseDao{
    constructor(key){
      super('users',key)
    }

    loadByName(username){
      return apifunc.get_user_by_name(username)
      .then(reslist=>{
        if(reslist.length==0)throw 'user not found by name'
        this.model = reslist[0]
        return this
      })
    }

    getPermissions(){
      if(!this.permissions){
        var permission = require('permissions')
        this.permissions = permission.getPermissionsFromUser(this.model)
      }
      return this.permissions
    }

    listForums(){
      var perm = this.getPermissions()
      var contentClasses = perm.contentClasses

      return AQL(`
        for f in forums
        filter f.type == 'forum' && f.parentid !=null

        let class = f.class
        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

        let nf = f

        collect parent = nf.parentid into forumgroup = nf
        let parentforum = document(forums,parent)

        let class = parentforum.class

        filter has(@contentClasses,TO_STRING(class)) /*content ctrl*/

        let group =  {parentforum,forumgroup}
        sort group.parentforum.order asc
        return group
        `,{contentClasses}
      )
    }
  }

  class Post extends BaseDao{
    constructor(key){
      super('posts',key)
    }

    mergeUsername(){
      var u = new User(this.model.uid)
      return u.load()
      .then(user=>{
        var p = Object.assign({},this.model)
        p.username = user.username
        return p
      })
    }
  }

  class Forum extends BaseDao{
    constructor(key){
      super('forums',key)
    }

    static buildIndex(){
      return queryfunc.createIndex('threads',{
        fields:['fid','disabled','tlm'],
        type:'skiplist',
        unique:'false',
        sparse:'false',
      })
    }

    inheritPropertyFromParent(){
      var p = this.model
      var parent

      return Promise.resolve()
      .then(()=>{
        if(!p.parentid||p.parentid=='0') throw 'parent not exist'

        parent = new Forum(p.parentid)
        return parent.load()
      })
      .then(parent=>{
        return parent.inheritPropertyFromParent() //recursive inheritance
      })
      .then(parent=>{
        var parent = parent.model
        p.class = p.class||parent.class
        p.color = p.color||parent.color
        p.moderators = parent.moderators.concat(p.moderators||[])
        return this
      })
      .catch(err=>{
        if(development){
          if(err!=='parent not exist'){
            report('parent load failed on '+p.parentid,err)
          }
        }

        //if no parent or parent not found
        p.class = p.class||null
        p.color = p.color||'#bbb'
        p.moderators = p.moderators||[]

        return this
      })
    }

    testView(contentClasses){
      var forum = this.model
      if(!forum.class)return this;
      if(contentClasses[forum.class]){ // if user have enough class
        return this;
      }else{
        throw 'no enough permission. you need a content-class named ['+ forum.class +']'
      }
    }

    getPagingParams(pagestr){
      var p = new Paging(pagestr)
      var t = this.model
      return p.getPagingParams(t.count_threads)
    }

    listThreadsOfPage(params){
      var pp = this.getPagingParams(params.page)

      if(params.digest){
        var filter = `
        filter t.fid == @fid && t.digest == true
        sort t.fid desc, t.digest desc, t.tlm desc
        `
      }else{
        var filter = `
        filter t.fid == @fid && t.disabled==null
        sort t.fid desc, t.disabled desc, t.tlm desc
        `
      }

      return AQL(`
        for t in threads
        ${filter}
        limit @start,@count

        let oc = document(posts,t.oc)
        let lm = document(posts,t.lm)
        let ocuser = document(users,oc.uid)
        let lmuser = document(users,lm.uid)

        return merge(t,{oc,ocuser,lmuser})

        `,
        {
          fid:this.key,
          start:pp.start,
          count:pp.count,
        }
      )
    }

  }

  class Paging {
    constructor(pagestr){
      function getPageFromString(pagestr){
        if(pagestr){
          var page = parseInt(pagestr)
          if(page===NaN)page = 0
        }else{
          var page = 0
        }
        return page
      }

      this.page = getPageFromString(pagestr)
    }

    getPagingParams(total_items){
      var page = this.page

      var perpage = 30
      var start = page * perpage
      var count = perpage

      var pagecount = total_items?Math.floor((total_items-1)/perpage)+1:null

      var paging = {
        page,
        perpage,
        start,
        count,
        pagecount,
      }

      return paging
    }
  }

  class Thread extends BaseDao{
    constructor(key){
      super('threads',key)
    }

    static buildIndex(){
      return queryfunc.createIndex('posts',{
        fields:['tid','toc'],
        type:'skiplist',
        unique:'false',
        sparse:'false',
      })
      .then(()=>{
        return queryfunc.createIndex('resources',{
          fields:['pid'],
          type:'hash',
          unique:'false',
          sparse:'false',
        })
      })
    }

    loadForum(){
      var t = this.model
      var f = new Forum(t.fid)
      return f.load()
      .then(res=>{
        return f.inheritPropertyFromParent()
      })
    }

    getPagingParams(pagestr){
      var p = new Paging(pagestr)
      var t = this.model
      return p.getPagingParams(t.count)
    }

    listPostsOfPage(pagestr){
      var pp = this.getPagingParams(pagestr)
      var start = pp.start
      var count = pp.count
      var tid = this.key

      return AQL(
        `
        for p in posts
        sort p.tid asc, p.toc asc
        filter p.tid == @tid

        limit @start,@count

        let user = document(users,p.uid)

        let resources_declared = (
          filter is_array(p.r)
          for r in p.r
          let rd = document(resources,r)
          filter rd!=null
          return rd
        )

        let resources_assigned = (
          for r in resources
          filter r.pid == p._key
          return r
        )

        return merge(p,{
          user,
          r:union_distinct(resources_declared,resources_assigned)
        })

        `,
        {
          tid:this.key,
          start,
          count,
        }
      )
    }

    mergeOc(){
      var t = this.model
      var oc = new Post(t.oc)
      return oc.load()
      .then(p=>{
        t.oc = p.model
        return this
      })
    }

    accumulateCountHit(){
      return this.incrementProperty('hits')
    }
  }


  layer.Post = Post
  layer.User = User
  layer.Forum=Forum
  layer.Thread = Thread
  layer.BaseDao = BaseDao

  return layer
})()

module.exports = layer

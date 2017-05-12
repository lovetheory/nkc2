$(function() {
  var easyPost = new EasyPost();
  easyPost.init();
});

var EasyPost = function() {
  this.parent = geid('parent');
  this.child = geid('child');
  this.post = geid('post');
  this.title = geid('title');
  this.content = geid('content');
};
EasyPost.prototype.init = function() {
  var self = this;
  var path = window.location.pathname.match(/^\/(.)\/([0-9]+)/);
  this.type = path[1];
  if(this.type === 'm') {
  /*  this.parent.style.display = 'none';
    this.child.style.display = 'none';
    this.type = 'm';
    this.id = path[2];
  }
  else {*/
    nkcAPI('getForumsList', {})
      .then(function(forumsList) {
        return groupingForums(forumsList, self);
      })
      .then(function() {
        var parent = geid('parent');
        var forumsList = self.forumsList;
        for(var i in forumsList) {
          parent.appendChild(createOption(forumsList[i].display_name));
        }
      })
  }
  geid('onlyM').onchange = onlyMListener(self);
  if(this)
};

var onlyMListener = function(that) {
  return function() {
    if(this.checked) {
      that.parent.setAttribute('disabled', 'disabled');
      that.child.setAttribute('disabled', 'disabled');
    }
    else {
      that.parent.removeAttribute('disabled');
      that.child.removeAttribute('disabled');
    }
  }
}

EasyPost.prototype.post = function() {
  var content = this.post.value.trim();
  var title = this.post.value.trim();
  var target = this.type + '/' + this.id;
  var language = gv('lang').toLowerCase().trim();
  var self = this;
  if(content === '') {
    screenTopWarning('请填写内容。');
    return;
  }
  if(title === '') {
    screenTopWarning('请填写标题。');
    return;
  }

  if(geid('parseURL').checked) {
    if(language === 'markdown') {
      content = common.URLifyMarkdown(content);
    }
    if(language === 'bbcode' || language === 'pwbb') {
      content = common.URLifyBBcode(content);
    }
    this.post.className = 'btn btn-primary disabled';
  }
  var post = {
    t: title,
    c: content,
    l: language
  };
  return nkcAPI('postTo', {
    target,
    post
  })
    .then(function(result) {
      var redirectTarget = result.redirect;
      redirect(redirectTarget?redirectTarget:'/'+target);
    })
    .catch(function(err) {
      jwarning(err.detail);
      self.post.className = 'btn btn-primary';
    })
};

var groupingForums = function(forumsList, that) {
  var group1;
  var group2;
  for(var index in forumsList) {
    var group = forumsList[index];
    if(group.parent == null) {
      group1 = group.group;
    }
    if(group.parent === '0') {
      group2 = group.group;
    }
  }
  that.forumsList = group1.concat(group2);
  for(var index in forumsList) {
    for(var i in self.forumsList) {
      if(forumsList[index].parent === that.forumsList[i]._key) {
        that.forumsList[i].children = forumsList[index].group;
      }
    }
  }
};

var createOption = function(text) {
  var textNode = document.createTextNode(text);
  var option = document.createElement('option');
  option.appendChild(textNode);
  return option;
};


/**
 * Created by lzszo on 2017/5/11.
 */

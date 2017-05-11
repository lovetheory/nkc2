$(function() {
  $('#content').focus = function() {

  }
});

var EasyPost = function() {

};
EasyPost.prototype.init = function() {
  var self = this;
  nkcAPI('getForumsList',{})
    .then(function(forumsList) {
      self.parentForums = {};
      self.childFroums = {};
      for(var index in forumsList) {
        var group = forumsList[index];
        var f;
        if(group.parent != null) {
          for(var i in group.group) {
            var forum = group.group[i];
            self.parentForums[forum.display_name] = forum._key;
          }
        }
        else {
          for(var i in group.group) {
            var forum = group.group[i];
            self.childFroums[]
          }
        }
      }
    })
}

/**
 * Created by lzszo on 2017/5/11.
 */

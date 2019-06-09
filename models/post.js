var mogondb = require('./db')
markdown = require('markdown').markdown

function Post ( name, title, post ) {
  this.name = name
  this.title = title
  this.post = post
}

module.exports = Post

Post.prototype.save = function (callback) {
  var date = new Date()
  var time = {
    date: date,
    year: date.getFullYear(),
    month: date.getFullYear() + '-' + (date.getMonth() + 1),
    day: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
    minute: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
  }
  // 要存入数据库的文档
  var post = {
    name: this.name,
    time: time,
    title: this.title,
    post: this.post
  }
  // 打开数据库
  mogondb.open(function (err, db) {
    if (err) {
      return callback(err)
    }
    // 读取 posts 集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      // 将文档插入posts集合
      collection.insert(post, {
        safe: true
      }, function (err) {
        mogondb.close()
        if (err) {
          return callback(err) // 失败！返回 err
        }
        callback(null)
      })
    })
  })
}
// 获取一个人的所有文章
Post.getAll = function (name, callback) {
  // 打开数据库
  mogondb.open(function (err, db) {
    if (err) {
      return callback(err)
    }
    // 读取posts集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      var query = {}
      if (name) {
        query.name = name
      }
      // 根据query对象查询文章
      collection.find(query).sort({
        time: -1
      }).toArray(function (err, docs) {
        mogondb.close()
        if (err) {
          return callback(err) // 失败！返回err
        }
        docs.forEach(doc => {
          doc.post = markdown.toHTML(doc.post)
        })
        callback(null, docs) // 成功，以数组形式返回查询单的结果
      })
    })
  })
}
// 获取一篇文章
Post.getOne = function (name, day, title, callback) {
  // 打开数据库
  mogondb.open(function (err, db) {
    if (err) {
      return callback(err)
    }
    // 读取posts集合
    db.collection('posts', function (err, collection) {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      // 根据用户名，发表日期及文章名进行查询
      collection.findOne({
        "name": name,
        "time.day": day,
        "title": title
      }, function (err, doc) {
        mogondb.close()
        if (err) {
          return callback(err) // 失败！返回err
        }
        // 解析markdown 为html
        doc.post = markdown.toHTML(doc.post)
        callback(null, doc)
      })
    })
  })
}
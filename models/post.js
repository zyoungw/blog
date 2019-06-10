var mogondb = require('./db')
markdown = require('markdown').markdown

function Post ( name, title, tags , post ) {
  this.name = name
  this.title = title
  this.post = post
  this.tags = tags
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
    title: this.title.trim(), // 去除首尾空格，避免数据库查询不到title带空格的数据
    post: this.post,
    tags: this.tags,
    comments: [],
    pv: 0
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
// 一次获取10篇文章
Post.getTen = function (name, page, callback) {
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
      // 使用count返回特定查询的文档数total
      collection.count(query, (err, total) => {
        // 根据query对象查询，并跳过前(page - 1)*10个结果,返回之后的10个结果
        collection.find(query, {
          skip: (page - 1) * 10,
          limit: 10
        }).sort({
          time: -1
        }).toArray((err, docs) => {
          mogondb.close()
          if (err) {
            return callback(err)
          }
          // 解析 markdown 为 html 
          docs.forEach(doc => {
            doc.post = markdown.toHTML(doc.post)
          })
          callback(null, docs, total)
        })
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
        if (err) {
          mogondb.close()
          return callback(err) // 失败！返回err
        }
        // 解析markdown 为html
        // doc.post = markdown.toHTML(doc.post)
        if (doc) {
          collection.update({
            name,
            "time.day": day,
            title
          }, {
            $inc: {
              pv: 1
            }
          }, err => {
            mogondb.close()
            if (err) {
              return callback(err)
            }
          })
          // 解析 markdown w欸html
          doc.post = markdown.toHTML(doc.post)
          doc.comments.forEach(comment => {
            comment.content = markdown.toHTML(comment.content)
          });
          // 返回查询的每一篇文章
          callback(null, doc)
        }
      })
    })
  })
}
// 返回原始发表的内容（marldown格式）
Post.edit = function (name, day, title, callback) {
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
      // 根据用户名、发表日期及文章名进行查询
      collection.findOne({
        name,
        "time.day": day,
        title: title.trim() // 去除首尾空格，避免数据库查询不到title带空格的数据
      }, (err, doc) => {
        mogondb.close()
        if (err) {
          return callback(err)
        }
        callback(null, doc)
      })
    })
  })
}
// 更新一篇文章及其相关信息
Post.update = function (name, day, title, post, callback) {
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
      // 更新文章内容
      collection.update({
        name,
        "time.day": day,
        title
      }, {
        $set: {post}
      }, function (err) {
        mogondb.close()
        if (err) {
          return callback(err)
        }
        callback(null)
      })
    }) 
  })
}
// 删除一片文章
Post.remove = function (name, day, title, callback) {
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
      // 根据用户名、日期和标题查找并删除一篇文章
      collection.remove({
        name,
        title,
        "time.day": day
      }, {
        w: 1
      }, function (err) {
        mogondb.close()
        if (err) {
          return callback(err)
        }
        callback(null)
      })
    })
  })
}
// 返回所有文章存档信息
Post.getArchive = function (callback) {
  // 打开数据库
  mogondb.open((err, db) => {
    if (err) {
      return callback(err)
    }
    // 读取 posts 集合
    db.collection('posts', (err, collection) => {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      // 返回只包含 name,time, tyitle 属性的文档组成的存档数组
      collection.find({}, {
        name: 1,
        time: 1,
        title: 1
      }).sort({
        time: -1
      }).toArray((err, docs) => {
        mogondb.close()
        if (err) {
          return callback(err)
        }
        callback(null, docs)
      })
    })
  })
}
// 返回所有的标签
Post.getTags = function (callback) {
  mogondb.open((err, db) => {
    if (err) {
      return callback(err)
    }
    db.collection('posts', (err, collection) => {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      // distinct 用来找出给定键的不同键值
      collection.distinct("tags", (err, docs) => {
        mogondb.close()
        if (err) {
          return callback(err)
        }
        callback(null, docs) // 这里的docs 回调的是tags的值
      })
    })
  })
}
// 返回含有特定标签的额所有文章
Post.getTag = (tag, callback) => {
  mogondb.open((err, db) => {
    if (err) {
      return callback(err)
    }
    db.collection('posts', (err, collection) => {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      // 查询所有tags数组内涵tag的文档
      // 并返回只返回name、time、title组成的数组
      collection.find({
        tags: tag
      }, {
        name: 1,
        time: 1,
        title: 1
      }).sort({
        time: -1
      }).toArray((err, docs) => {
        mogondb.close()
        if (err) {
          return callback(err)
        }
        callback(null, docs)
      })
    })
  })
}
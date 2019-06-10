var mogondb = require('./db')
markdown = require('markdown').markdown

function Post ( name, head, title, tags , post ) {
  this.name = name
  this.title = title
  this.post = post
  this.tags = tags
  this.head = head
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
    time,
    title: this.title.trim(), // 去除首尾空格，避免数据库查询不到title带空格的数据
    post: this.post,
    tags: this.tags,
    comments: [],
    pv: 0,
    head: this.head,
    reprint_info: {}
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
Post.update = function (name, day, title, post, tags, callback) {
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
        $set: {
          post,
          tags
        }
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
      // 查询要删除的文档
      collection.findOne({
        name,
        "time.day": day,
        title
      }, (err, doc) => {
        if (err) {
          mogondb.close()
          return callback(err)
        }
        // 如果有 reprint_from，即该文章是转载来的，先保存下来 reprint_from
        var reprint_from = doc.reprint_info.reprint_from || ""
        if (reprint_from) {
          // 更新源文章所在文档的reprint_to
          collection.update({
            name: reprint_from.name,
            "time.day": reprint_from.day,
            title: reprint_from.title
          }, {
            $pull: {
              "reprint_info.reprint_to": {
                name,
                day,
                title
              }
            }
          }, err => {
            if (err) {
              mogondb.close()
              return callback(err)
            }
          })
        }
        // 删除转载来的文章所在的文档
        collection.remove({
          name,
          "time.day": day,
          title
        }, {
          w: 1
        }, err => {
          mogondb.close()
          if (err) {
            return callback(err)
          }
          callback(null)
        })
      })
      // // 根据用户名、日期和标题查找并删除一篇文章
      // collection.remove({
      //   name,
      //   title,
      //   "time.day": day
      // }, {
      //   w: 1
      // }, function (err) {
      //   mogondb.close()
      //   if (err) {
      //     return callback(err)
      //   }
      //   callback(null)
      // })
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
// 返回通过标题关键字查询的所有文章信息
Post.search = (keyword, callback) => {
  mogondb.open((err, db) => {
    if (err) {
      return callback(err)
    }
    db.collection('posts', (err, collection) => {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      var pattern =  new RegExp(keyword, "i")
      collection.find({
        title: pattern
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
// 转载一篇文章
Post.reprint = (reprint_from, reprint_to, callback) => {
  mogondb.open((err, db) => {
    if (err) {
      return callback(err)
    }
    db.collection('posts', (err, collection) => {
      if (err) {
        mogondb.close()
        return callback(err)
      }
      // 找到被转载的文章的原文档
      collection.findOne({
        name: reprint_from.name,
        "time.day": reprint_from.day,
        "title": reprint_from.title
      }, (err, doc) => {
        if (err) {
          mogondb.close()
          return callback(err)
        }
        var date = new Date()
        var time = {
          date: date,
          year: date.getFullYear(),
          month: date.getFullYear() + '-' + (date.getMonth() + 1),
          day: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
          minute: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
        }
        delete doc._id // 注意要删掉原来的 _id
        doc.name = reprint_to.name
        doc.head = reprint_to.head
        doc.time = time
        doc.title = (doc.title.search(/[转载]/) > -1 ? doc.title : "[转载]" + doc.title)
        doc.comments = []
        doc.reprint_info = {
          reprint_from
        }
        doc.pv = 0
        // 更新被转载的原文档的reprint_info内的reprint_to
        collection.update({
          name: reprint_from.name,
          "time.day": reprint_from.day,
          title: reprint_from.title
        }, {
          $push: {
            "reprint_info.reprint_to": {
              name: doc.name,
              day: time.day,
              title: doc.title
            }
          }
        }, err => {
          if (err) {
            mogondb.close()
            return callback(err)
          }
        })
        // 将转载生成的副本修改后存入数据库，并返回存储后的文档
        collection.insert(doc, {
          safe: true
        }, (err, post) => {
          mogondb.close()
          if (err) {
            return callback(err)
          }
          callback(err, post.ops[0])
        })
      })
    })
  })
}
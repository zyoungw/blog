// var express = require('express');
// var router = express.Router();

var crypto = require('crypto'),  // nodejs的一个核心模块，可以用它来生成散列值来加密密码
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Comment = require('../models/comment.js');

module.exports = function (app) {
  /* GET home page. */
  app.get('/', function(req, res, next) {
    // 判断是否为第一页，并把请求的椰树转化成 number 类型
    var page = req.query.p ? parseInt(req.query.p) : 1
    // 查询并返回第 page 页的10篇文章
    Post.getTen(null, page, (err, posts, total) => {
      if (err) {
        posts = []
      }
      res.render('index', {
        title: '主页',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString(),
        posts: posts,
        page,
        isFirstPage: (page - 1) == 0,
        isLastPage: ((page - 1) * 10 + posts.length) == total
      })
    })
  })
  // 注册
  app.get('/reg', checkNotLogin)
  app.get('/reg', function(req, res, next) {
    res.render('reg', {
      title: '注册',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
  app.post('/reg', checkNotLogin)
  app.post('/reg', function(req, res) {
    var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
    // 校验用户两次输入的密码是否一致
    if (password_re != password) {
      req.flash('error', '两次输入的密码不一致！')
      return res.redirect('/reg') // 返回注册页
    }
    // 生成密码的md5值
    var md5 = crypto.createHash('md5')
    password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
      name,
      password,
      email: req.body.email
    })
    // 检查用户名是否已经存在
    User.get(newUser.name, function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/')
      }
      if (user) {
        req.flash('error', '用户已存在！');
        return res.redirect('/reg'); // 返回注册页
      }
      // 如果不存在则新增用户
      newUser.save(function (err, user) {
        if (err) {
          req.flash('error', err)
          return res.redirect('/reg') // 注册失败！返回注册页
        }
        req.flash('success', '注册成功！')
        req.session.user = user // 用户信息存入 session
        res.redirect('/') // 注册成功后返回主页
      })
    })
  });
  // 登录
  app.get('/login', checkNotLogin);
  app.get('/login', function(req, res, next) {
    res.render('login', {
      title: '登录',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
  app.post('/login', checkNotLogin);
  app.post('/login', function(req, res) {
    // 生成密码的 md5 值
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex')
    User.get(req.body.name, function (err, user) {
      if (!user) {
        req.flash('error', '用户不存在！')
        return res.redirect('/login') // 用户不存在则条状到登录页
      }
      // 检查密码是否一致
      if (user.password != password) {
        req.flash('error', '密码错误！')
        return res.redirect('login')
      }
      // 用户名密码都匹配后，将用户信息存入 session
      req.session.user = user
      req.flash('success', '登录成功！')
      res.redirect('/') // 登录成功后跳转到主页
    })
  });
  // 发表
  app.get('/post', checkLogin)
  app.get('/post', function(req, res, next) {
    res.render('post', {
      title: '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  })
  app.post('/post', checkLogin)
  app.post('/post', function(req, res, next) {
    var currentUser = req.session.user,
        post = new Post(currentUser.name, req.body.title, req.body.post);
    // console.log(req, currentUser, post)
    post.save(function (err) {
      if (err) {
        req.flash('error', err)
        return res.redirect('/')
      }
      req.flash('success', '发布成功！')
      res.redirect('/') // 发表成功跳转到主页
    })
  });
  // 登出
  app.get('/logout', checkLogin)
  app.get('/logout', function(req, res, next) {
    // res.render('logout', { title: '发表' });
    req.session.user = null
    req.flash('success', '登出成功！')
    res.redirect('/') // 登出成功后跳转到主页
  });
  // 上传图片
  app.get('/upload', checkLogin)
  app.get('/upload', function (req, res) {
    res.render('upload', {
      title: '文件上传',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    })
  })
  app.post('/upload', checkLogin)
  app.post('/upload', function (req, res) {
    req.flash('success', '文件上传成功')
    res.redirect('/upload')
  })
  app.get('/u/:name', function (req, res) {
    // 检查用户是否存在
    User.get(req.params.name, function (err, user) {
      // 判断是否为第一页，并把请求的椰树转化成 number 类型
      var page = req.query.p ? parseInt(req.query.p) : 1
      // 检查用户是否存在
      User.get(req.params.name, (err, user) => {                                              
        if (!user) {
          req.flash('error', '用户不存在！')
          return res.redirect('/')
        }
        // 查询并返回第 page 页的10篇文章
        Post.getTen(user.name, page, (err, posts, total) => {
          if (err) {
            // posts = []
            req.flash('error', err)
            return res.redirect('/')
          }
          res.render('index', {
            title: user.name,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString(),
            posts,
            page,
            isFirstPage: (page - 1) == 0,
            isLastPage: ((page - 1) * 10 + posts.length) == total
          })
        })
      })
    })
  })
  // 存档
  app.get('/archive', (req, res) => {
    Post.getArchive((err, posts) => {
      if (err) {
        req.flash('error', err)
        return res.redirect('/')
      }
      res.render('archive', {
        title: '存档',
        posts,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  })
  app.get('/u/:name/:day/:title', function (req, res) {
    Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
      if (err) {
        req.flash('error', 'err')
        return res.redirect('/')
      }
      res.render('article', {
        title: req.params.title,
        post,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  })
  // 留言
  app.post('/u/:name/:day/:title', function (req, res) {
    var date = new Date(),
        time = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()<10 ? '0'+date.getMinutes() : date.getMinutes()}`,
        comment = {
          name: req.body.name,
          email: req.body.email,
          website: req.body.website,
          time,
          content: req.body.content
        };
    var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
        newComment.save(err => {
          if (err) {
            req.flash('error', 'err')
            return res.redirect('back')
          }
          req.flash('success', '留言成功')
          res.redirect('back')
          
        })
  })
  // 编辑
  app.get('/edit/:name/:day/:title', checkLogin)
  app.get('/edit/:name/:day/:title', function (req, res) {
    var currentUser = req.session.user
    Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
      if (err) {
        req.flash('error', 'err')
        return res.redirect('back')
      }
      res.render('edit', {
        title: '编辑',
        user: req.session.user,
        post,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      })
    })
  })
  app.post('/edit/:name/:day/:title', checkLogin)
  app.post('/edit/:name/:day/:title', function (req, res) {
    var currentUser = req.session.user
    Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
      var url = encodeURI(`/u/${req.params.name}/${req.params.day}/${req.params.title}`)
      if (err) {
        req.flash('error', 'err')
        return res.redirect(url) // 出错！返回文章页
      }
      req.flash('success', '修改成功！')
      res.redirect(url) // 成功， 返回文章页    
    })
  })
  // 删除
  app.get('/remove/:name/:day/:title', checkLogin)
  app.get('/remove/:name/:day/:title', function (req, res) {
    var currentUser = req.session.user
    Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
      if (err) {
        req.flash('error', err)
        return res.redirect('back')
      }
      req.flash('success', '删除成功')
      res.redirect('/')
    })
  })
  // 登录检测
  function checkLogin(req, res, next) {
    if (!req.session.user) {
      req.flash('error', '未登录！')
      res.redirect('/login')
    }
    next()
  }
  function checkNotLogin(req, res, next) {
    if (req.session.user) {
      req.flash('error', '已登录！')
      res.redirect('back')
    }
    next()
  }
}

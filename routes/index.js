// var express = require('express');
// var router = express.Router();

var crypto = require('crypto'),  // nodejs的一个核心模块，可以用它来生成散列值来加密密码
    User = require('../models/user.js');

module.exports = function (app) {
  /* GET home page. */
  app.get('/', function(req, res, next) {
    res.render('index', { title: '主页' });
  });
  app.get('/reg', function(req, res, next) {
    res.render('reg', { title: '注册' });
  });
  app.post('/reg', function(req, res) {
    var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
    // 校验用户两次输入的密码是否一致
    if (password_re != password) {
      req.flash('error', '两次输入的密码不一致！')
      return res.direct('/reg') // 返回注册页
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
        req.session.user = user // 用户信息存入 session
        res.redirect('/') // 注册成功后返回主页
      })
    })
  });
  app.get('/login', function(req, res, next) {
    res.render('login', { title: '登录' });
  });
  app.post('/login', function(req, res) {
  });
  app.get('/post', function(req, res, next) {
    res.render('post', { title: '发表' });
  });
  app.post('/post', function(req, res) {
  });
  app.get('/logout', function(req, res, next) {
    // res.render('logout', { title: '发表' });
  });
}

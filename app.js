var createError = require('http-errors');
var express = require('express');
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;

var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session')
var MongoStore = require('connect-mongo')(session)

var routes = require('./routes/index')
var settings = require('./settings')
var flash = require('connect-flash')
var multer = require('multer')

var app = express();
var fs = require('fs')
var accessLog = fs.createWriteStream('access.log', {
  flag: 'a'
})
var errorLog = fs.createWriteStream('error.log', {
  flags: 'a'
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(logger({
  stream: accessLog
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (err, req, res, next) {
  var meta = `[${new Date()}]${req.url}\n`
  errorLog.write(meta + err.stack + '\n')
  next()
})
app.use(multer({
  dest: './public/images',
  rename: function (fieldname, fieldname) {
    return fieldname
  }
}))

app.use(session({
  secret: settings.cookieSecret,
  key: settings.db, // cookie name
  cookie: {maxAge: 1000 * 60 * 60 * 24 * 30}, // 30 days
  store: new MongoStore({
    db: settings.db,
    host: settings.host,
    port: settings.port,
    url: 'mongodb://localhost/blog'
  })
}))

app.use(flash()) // flash 依赖 session，所以必须放在session的引入之后

app.use(passport.initialize()) // 初始化 Passport

routes(app)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

passport.use(new GithubStrategy({
  clientID: "41d94a44ffbd250ca435",
  clientSecret: "8b2c1e6dbed9fe524bc8d8696b93b6df7b72357f",
  callbackURL: "http://localhost:3000/login/github/callback",
}, (accessToken, refreshToken, profile, done) => {
  done(null, profile)
}))

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

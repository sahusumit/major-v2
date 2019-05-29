var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');

require('./passport')(passport)

mongoose.connect('mongodb://localhost:27017/login', { useNewUrlParser: true });

var index = require('./routes/index');
var users = require('./routes/users');
var auth = require('./routes/auth')(passport);
var network = require('./routes/networknode');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'thesecret',
  saveUninitialized: false,
  resave: false
}))

app.use(passport.initialize())
app.use(passport.session())

app.use('/', index);
app.use('/users', users);
app.use('/auth', auth);
app.use('/network',network);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const PORT = process.argv[2] || 3000;

app.listen(PORT, console.log(`Server started on port ${PORT}`));
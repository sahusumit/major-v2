var express = require('express');
var router = express.Router();
var User = require('../db/User');

var loggedin = function (req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {
    user: req.user
  });
});


router.get('/login', function (req, res, next) {
  res.render('login');
});


router.get('/signup', function (req, res, next) {
  res.render('signup');
});


router.get('/profile', loggedin, function (req, res, next) {

  User.findOne({'username':req.user.username},function(err,doc) {
    if(err) {
      return res.send(500, { error: err });
    } else {
      res.render('profile', {
        user: doc
      })
    }
  });


});

router.get('/update', loggedin, function (req, res, next) {
  res.render('update', {
    user: req.user
  })
});

router.get('/disease', function (req, res, next) {
  res.render('disease');
});

router.get('/:disease/edit', function (req, res, next) {
  res.render('edit',{
    id:req.params.disease
  });
});

router.get('/:disease/view', loggedin,function (req, res, next) {

  User.find({'username':req.user.username},function(err,doc) {
    if(err) {
      return res.send(500, { error: err });
    } else {
      var diseases = doc[0].diseases;
      var arr = [];
      diseases.forEach(function(dis){
        if(dis.title==req.params.disease) {
          arr=dis;
        }
      });
  
      res.render('view', {
        disease: arr
      })
    }
  });

});


router.get('/logout', function (req, res) {
  req.logout()
  res.redirect('/')
});

module.exports = router;
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

router.post('/:id/edit', function (req, res, next) {

  const body = req.body;
  const id = req.params.id;

  User.update({'diseases._id': id}, {
    '$set': 
    {
      'diseases.$.healthissue': body.healthissue,
      'diseases.$.response':body.response,
      'diseases.$.doctor':body.doctor,
      'diseases.$.medications':body.medication,
      'diseases.$.hospital':body.hospital,
      'diseases.$.tests':body.tests,
      'diseases.$.treatment':body.treatment,
      'diseases.$.status':body.status,
    }
  }, function(err,doc) {
    
    if(err) {
      return res.send(500, { error: err });
    }
    res.redirect('/profile');
  });

});

router.post('/disease', function (req, res, next) {

  const body = req.body;

  const diseaseInfo = {
    'title':body.title,
    'healthissue':body.healthissue,
    'response':body.response,
    'doctor':body.doctor,
    'medications':body.medication,
    'hospital':body.hospital,
    'tests':body.tests,
    'treatment':body.treatment,
    'status':body.status
  };

  var query = {'username':req.user.username};

  User.findOneAndUpdate(query, { $push: { diseases: diseaseInfo  } },{new:true}, function(err, doc){

    if (err) return res.send(500, { error: err });

    res.render('profile',{
      user:doc
    });
    
  });
});

router.post('/update',loggedin, function(req, res, next) {

  const body = req.body;
  
  const newBody = {
    'fullname':body.name,
    'mobileno': body.mobile,
    'address': body.address,
    'dateofbirth':body.dateofbirth,
    'sex':body.sex,
    'emergencycontact':body.emergency,
    'bloodgroup':body.bloodgroup,
    'allergies':body.allergies,
    'bmi':body.bmi,
    'accidents':body.accidents,
    'history':body.history,
  };

  var query = {'username':req.user.username};
  User.findOneAndUpdate(query, newBody, {upsert:true,new:true}, function(err, doc){
      if (err) return res.send(500, { error: err });
      res.render('profile',{
        user:doc
      });
      // return res.send("succesfully saved");
  });
});

module.exports = router;



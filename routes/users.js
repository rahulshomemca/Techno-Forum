const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
// Load User model
const User = require('../models/User');

// Welcome
router.get('/', (req, res) => res.redirect('/'));

// Login Page
router.get('/login', (req, res) => {
  if(req.user)
  {
      res.redirect("/dashboard");
  }
  else
  {
    res.render('login');
  }
});

// Register Page
router.get('/register', (req, res) => {
  if(req.user)
  {
      res.redirect("/dashboard");
  }
  else
  {
    res.render('register');
  }
});

// Register
router.post('/register', (req, res) => {
  const { firstname, lastname, email, mobile,password, password2 } = req.body;
  let errors = [];
  var nm=/^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{2,}$/;
  var mob=/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;
  var pass = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

  if (!firstname ||!lastname ||!email || !password || !password2 || !mobile) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (!firstname.match(nm)){
    errors.push({ msg: 'Invalid First Name' });
  }

  if (!lastname.match(nm)){
    errors.push({ msg: 'Invalid Last Name' });
  }

  if (!password.match(pass)){
    errors.push({ msg: 'Password must contain minimum eight characters, at least one letter, one number and one special character' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (!mobile.match(mob)){
    errors.push({ msg: 'Invalid Mobile' });
  }

  if (errors.length > 0) {
    res.render('register', {
      errors,
      firstname,
      lastname,
      email,
      mobile,
      password,
      password2
    });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user){
        errors.push({ msg: 'Email already exists' });
        res.render('register', {
          errors,
          firstname,
          lastname,
          email,
          mobile,
          password,
          password2
        });
      } else {
        const newUser = new User({
          firstname,
          lastname,
          email,
          mobile,
          password,
          hash:Date.now()
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.hash = hash;
          }
        )});

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => {
                req.flash(
                  'success_msg',
                  'You are now registered and can log in'
                );
                res.redirect('/users/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;

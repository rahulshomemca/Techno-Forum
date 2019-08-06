const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Question = require('../models/Question');
const Reply = require('../models/Reply');
const fs = require('fs');
const app = express();
const user = require('../config/keys').username;
const pass = require('../config/keys').password;
const url = require('url');

app.use( express.static("public"));

// Email Setup

var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: user,
    pass: pass
  }
});

// Welcome Page
router.get('/',function(req, res) {
  if(req.user)
  {
      res.redirect("/dashboard");
  }
  else
  {
    res.render('welcome');
  }
});

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) =>
  Question.find().sort({_id:-1}).exec(function(err,result){
    if(err){
      console.log(err);
    }
    else{
      res.render('dashboard', {
        user: req.user,
        questions:result
      })
    }
  })
);

// Search
router.post('/search', ensureAuthenticated, (req, res) =>
  Question.find({ $or: [ {'question': {'$regex': new RegExp(req.body.search, "i")}}, {'catagory': {'$regex': new RegExp(req.body.search, "i")}} ] },function(err,result){
    if(err){
      console.log(err);
    }
    else
    {
      res.render('dashboard', {
        user: req.user,
        questions:result
      })
    }
  })
);

// Question
router.get('/question', ensureAuthenticated, (req, res) =>
  Question.find({user_id:req.user._id},function(err,result){
    res.render('question', {
      questions : result,
      user: req.user
    })
  })
);

// Add Question
router.get('/addquestion', ensureAuthenticated, (req, res) =>
    res.render('addquestion', {
      user: req.user
    })
);

// View User's Given Answer
router.get('/answer', ensureAuthenticated , function(req,res){
  Reply.find({user_id:req.user._id},function(err,result){
    if(err) console.log(err)
    else{
      res.render('answer',{
        user:req.user,
        results:result
      })
    }
  })
})

// Set Edit Profile
router.get('/editprofile', ensureAuthenticated, (req, res) =>
  res.render('editprofile', {
    user: req.user
  })
);


// Change Profile Image
router.post('/change_image', ensureAuthenticated,(req, res) => {

  // Set The Storage Engine
  const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb){
      cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });

  // Init Upload
  const upload = multer({
    storage: storage,
    limits:{fileSize: 1000000},
    fileFilter: function(req, file, cb){
      checkFileType(file, cb);
    }
  }).single('profile_image');

  // Check File Type
  function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
      return cb(null,true);
    } else {
      cb('Error: Images Only!');
    }
  }

  upload(req, res, (err) => {
    if(err){
      req.flash(
        'error_msg',
        err
      );
      res.redirect('/editprofile');
    } else {
      if(req.file == undefined){
        req.flash(
          'error_msg',
          'No File Selected!'
        );
        res.redirect('/editprofile');
      } 
      else 
      {
        // Don't Remove Default Image From File Server
        if(req.user.profile_image != 'default.png'){
          let reqPath = path.join(__dirname, '../public/uploads/'+req.user.profile_image);
          fs.unlinkSync(reqPath);
        }
        User.findOneAndUpdate({email:req.user.email}, {profile_image : req.file.filename}, function(err, student){
          if(err){
            req.flash(
              'error_msg',
              'No File Selected!'
            );
          }
          req.flash(
            'success_msg',
            'Profile Image Sucsessfully Changed!!'
          );
          res.redirect("/editprofile");
        });
      }
    }
  });
});

// Change Password
router.post('/changepassword', ensureAuthenticated, (req, res) => {
  const { password, newpassword, newpassword2 } = req.body;
  let errors = [];
  var pass = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

  if (!password || !newpassword || !newpassword2 ) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (!newpassword.match(pass)){
    errors.push({ msg: 'Password must contain minimum eight characters, at least one letter, one number and one special character' });
  }

  if (newpassword != newpassword2) {
    errors.push({ msg: 'New Passwords do not match' });
  }

  if (errors.length > 0) {
    res.render('editprofile', {
      errors,
      password,
      newpassword,
      newpassword2,
      user:req.user
    });
  } 
  else 
  {
    bcrypt.compare(password, req.user.password, (err, isMatch) => {
      if (err) throw err;
      if(isMatch) 
      {
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newpassword, salt, (err, hash) => {
            if(err){
              req.flash(
                'error_msg',
                err
              );
              res.redirect("/editprofile");
            }
            else
            {
              User.findOneAndUpdate({email:req.user.email}, {password : hash}, function(err, student){
                if(err){
                  req.flash(
                    'error_msg',
                    err
                  );
                  res.redirect("/editprofile");
                }
                req.flash(
                  'success_msg',
                  'Password Sucsessfully Changed!!'
                );
                res.redirect("/editprofile");
              });
            }
          });
        });
      } 
      else 
      { 
        req.flash(
          'error_msg',
          'Wrong Password!!'
        );
        res.redirect("/editprofile");
      }
    });
  }
});


// Edit Profile
router.post('/editprofile', ensureAuthenticated,(req, res) => {
  const { firstname, lastname, email, mobile } = req.body;
  let errors = [];
  var nm=/^[\w'\-,.][^0-9_!¡?÷?¿/\\+=@#$%ˆ&*(){}|~<>;:[\]]{2,}$/;
  var mob=/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[789]\d{9}$/;

  if (!firstname ||!lastname ||!email || !mobile) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (!firstname.match(nm)){
    errors.push({ msg: 'Invalid First Name' });
  }

  if (!lastname.match(nm)){
    errors.push({ msg: 'Invalid Last Name' });
  }

  if (!mobile.match(mob)){
    errors.push({ msg: 'Invalid Mobile' });
  }

  if (errors.length > 0) {
    res.render('editprofile', {
      errors,
      firstname,
      lastname,
      email,
      mobile,
      user:req.user
    });
  } 
  else 
  {
    User.findOne({$and:[{email:email},{_id: {$ne:req.user._id}}]}).then(user => {
      if (user){
        errors.push({ msg: 'Email already exists' });
        res.render('editprofile', {
          errors,
          firstname,
          lastname,
          email,
          mobile,
          user:req.user
        });
      } 
      else 
      {
        var data = {
          firstname : req.body.firstname,
          lastname : req.body.lastname,
          email : req.body.email,
          mobile : req.body.mobile
        }

        User.findOneAndUpdate({_id:req.user._id}, data , function(err, student){
          if(err){
            req.flash(
              'error_msg',
              err
            );
            res.redirect("/editprofile");
          }
          req.flash(
            'success_msg',
            'Your Profile Successfully Updated!!'
          );
          res.redirect("/editprofile");
        });
      }
    });
  }
});

// Add Question
router.post('/addquestion', ensureAuthenticated,(req, res) => {
  const { question, catagory, description, code } = req.body;
  let errors = [];
  if(!question){
    errors.push({ msg: 'Please enter Your Question' });
  }
  if(catagory == "null"){
    errors.push({ msg: 'Please Choose a Catagory' });
  }
  if (errors.length > 0) {
    res.render('addquestion', {
      errors,question, catagory, description, code , user:req.user
    });
  }
  else
  {
    const Ques = {
      question : req.body.question,
      catagory : req.body.catagory,
      description : req.body.description,
      code : req.body.code,
      user_id : req.user._id,
      user_name : req.user.firstname
    };
  
    Question.create(Ques,function(err,result){
      req.flash(
        'success_msg',
        'Question Added'
      );
      res.redirect('/question');
    });
  }
});


// View Question

router.get('/editquestion/:id',ensureAuthenticated,function(req,res){
  Question.findOne({_id:req.params.id,user_id:req.user._id} , function(err,result){
		if(err)
      console.log(err);
    if(result){
      res.render('viewquestion',{
        data:result,
        user:req.user
      })
    }
    else{
      req.flash(
        'error_msg',
        'Invalid Question Link or You are not the writer of the question'
      );
      res.redirect('/question');
    }
	});
})


// Update Question
router.post('/updatequestion', ensureAuthenticated,(req, res) => {
  const { question, catagory, description, code , id} = req.body;
  let errors = [];
  if(!question){
    errors.push({ msg: 'Error in Updating : Please enter Your Question' });
  }
  if(catagory == "null"){
    errors.push({ msg: 'Error in Updating : Please Choose a Catagory' });
  }
  if (errors.length > 0) {
    Question.findOne({_id:id},function(err,result){
      res.render('viewquestion',{
        errors,data:result,user:req.user
      });
    })
  }
  else
  {
    const Ques = {
      question : req.body.question,
      catagory : req.body.catagory,
      description : req.body.description,
      code : req.body.code,
      user_id : req.user._id,
      user_name : req.user.firstname
    };
  
    Question.findOneAndUpdate({_id:id},Ques,function(err,result){
      req.flash(
        'success_msg',
        'Question Updated'
      );
      res.redirect('/question');
    });
  }
});

// User Details
router.get('/user/:id',ensureAuthenticated,function(req,res){
  User.findOne({_id:req.params.id},function(err,result){
    if(err){
      console.log(err);
    }
    if(!result){
      res.redirect('/dashboard');
    }
    else
    {
      res.render('user',{
        user:req.user,
        data:result
      })
    }
  })
})

// Question Details
router.get('/reply/:id',ensureAuthenticated,function(req,res){
  Question.findOne({_id:req.params.id},function(err,result){
    if(err){
      console.log(err);
    }
    if(!result){
      res.redirect('/dashboard');
    }
    else
    {
      Question.findOneAndUpdate({_id:req.params.id},{views:result.views+1},function(err,result1){
        if(!result1){
          res.redirect('/dashboard');
        }
        else
        {
          Reply.find({question_id:req.params.id}).sort({date:-1}).exec(function(err,reply){
            res.render('viewreply',{
              user:req.user,
              data:result1,
              replies:reply
            })
          })
        }
      });
    }
  })
})

// Question Details for Reply
router.get('/answer/:id',ensureAuthenticated,function(req,res){
  Question.findOne({_id:req.params.id},function(err,result){
    if(err){
      console.log(err);
    }
    if(!result){
      res.redirect('/dashboard');
    }
    else
    {
      res.render('replyquestion',{
        user:req.user,
        data:result
      })
    }
  })
})



// Add Reply / Answer
router.post('/replyquestion', ensureAuthenticated,(req, res) => {
  const { answer, code, question_id, question } = req.body;
  let errors = [];
  if(!answer){
    errors.push({ msg: 'Please enter Your Answer' });
  }
  if (errors.length > 0) {
    Question.findOne({_id:question_id},function(err,result){
      if(err){
        console.log(err)
      }
      else{
        res.render('replyquestion', {
          errors, answer, code, user:req.user, data:result
        });
      }
    });
  }
  else
  {
    const Rply = {
      question_id : req.body.question_id,
      question : req.body.question,
      answer : req.body.answer,
      code : req.body.code,
      user_id : req.user._id,
      user_name : req.user.firstname
    };
  
    Reply.create(Rply,function(err,result){
      if(err)
        console.log(err)
      else
      {
        Reply.find({question_id:question_id},function(err,res45){
          if(err)
          console.log(err)
          Question.findOneAndUpdate({_id:question_id},{answer:res45.length},function(err,result10){
            if(err)
              console.log(err)
              Reply.find({question_id:question_id}).sort({date:-1}).exec(function(err,result20){
                if(err){
                  console.log(err)
                }
                else{
                  res.render('viewreply', {
                    user:req.user, 
                    data:result10,
                    replies:result20
                  });
                }
              });
          });
        })
      }
    });
  }
});

// Delete Question
router.get('/deletereply/:id/:qid',ensureAuthenticated,function(req,res){
  Question.findOne({_id:req.params.qid},function(err,res1){
    Question.findOneAndUpdate({_id:req.params.qid},{answer:res1.answer-1},function(err,res2){
      Reply.findOneAndRemove({_id:req.params.id,user_id:req.user._id},function(err,result){
        if(err){
          console.log(err)
        }
        else
        {
          if(result){
            req.flash(
              'success_msg',
              'Reply / Answer Successfully Deleted'
            );
          }
          else
          {
            req.flash(
              'error_msg',
              'Invalid Answer ID'
            );
          }
          res.redirect('/answer');
        }
      })
    })
  })
});


// Edit Reply Get Data

router.get('/editreply/:id/:qid',ensureAuthenticated,function(req,res){
  Question.findOne({_id:req.params.qid},function(err,res1){
    console.log(res1)
    Reply.findOne({_id:req.params.id,user_id:req.user._id},function(err,result){
      if(err){
        console.log(err)
      }
      else
      {
        res.render('editreply',{
          data:res1,
          reply:result,
          user:req.user
        })
      }
    })
  })
});

// Edit Reply
router.post('/editreply', ensureAuthenticated,(req, res) => {
  const { answer, code, question_id, question , reply_id } = req.body;
  let errors = [];
  if(!answer){
    errors.push({ msg: 'Error in Updating : Please enter Your Answer' });
  }
  if (errors.length > 0) {
    Question.findOne({_id:question_id,user_id:req.user._id},function(err,res1){
      Reply.findOne({_id:reply_id,user_id:req.user._id},function(err,result){
        if(err){
          console.log(err)
        }
        else
        {
          res.render('editreply',{
            data:res1,
            reply:result,
            user:req.user,
            answer, code
          })
        }
      })
    })
  }
  else
  {
    const Rply = {
      question_id : req.body.question_id,
      question : req.body.question,
      answer : req.body.answer,
      code : req.body.code,
      user_id : req.user._id,
      user_name : req.user.firstname
    };
  
    Reply.findOneAndUpdate({_id:reply_id},Rply,function(err,result){
      req.flash(
        'success_msg',
        'Reply Updated'
      );
      res.redirect('/answer');
    });
  }
});

// Delete Question

router.get('/deletequestion/:id',ensureAuthenticated,function(req,res){
  Reply.findOneAndRemove({question_id:req.params.id,user_id:req.user._id},function(err,res11){
    if(err) console.log(err)
    else
    {
      Question.findByIdAndRemove({_id:req.params.id,user_id:req.user._id},function(err,result){
        if(err)
          console.log(err)
        else
        {
          req.flash(
            'success_msg',
            'Question Deleted Sucessfullly'
          );
          res.redirect('/question');
        }
      })
    }
  })
});



// Delete Account
router.get('/deleteacc',ensureAuthenticated,function(req,res){
  Reply.findByIdAndRemove({user_id:req.user._id},function(err,res1){
    if(req.user.profile_image != 'default.png'){
      let reqPath = path.join(__dirname, '../public/uploads/'+req.user.profile_image);
      fs.unlinkSync(reqPath);
    }
    Question.findByIdAndRemove({user_id:req.user._id},function(err,res1){
      User.findByIdAndRemove({_id:req.user._id},function(err,res3){
        res.redirect('/users/register');
      })
    })
  })
})


// Forgot Password

router.get('/forgotpassword',function(req,res){
  res.render('forgot.ejs');
});


// Get Link

router.post('/getlink',function(req,res){
  User.findOne({email:req.body.email},function(err,result){
    if(err)
      console.log(err)
    if(result){
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(result.hash, salt, (err, hash) => {
          if (err) throw err;
          const output = `
        Hello!! ${result.firstname} ${result.lastname}
        Click on the below link to reset your password
        http://techonoforum.herokuapp.com/resetpassword?email=${result.email}&id=${hash}
      `;
      var mailOptions = {
        from: 'noreply@techonoforum.com',
        to: req.body.email,
        subject: 'Techono Forum : Forget Password Link',
        text: output
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } 
        else 
        {
          req.flash(
            'success_msg',
            'Reset link has been sent to '+req.body.email
          );
          res.redirect('/users/login');
        }
      });
        }
      )});
    }
    else
    {
      let errors = [];
      errors.push({ msg: 'Email not registered!' });
      if (errors.length > 0) {
        res.render('forgot', {
          errors,
          email:req.body.email
        });
      }
    }
  })
})

// Reset password
router.get('/resetpassword?*',function(req,res){
  var q = url.parse(req.url, true);
  var qdata = q.query;
  let errors = [];
  User.findOne({email:qdata.email},function(err,result){
    if(err)
      console.log(err);
    if(result)
    {
      bcrypt.compare(result.hash, qdata.id, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) {
          res.render('forgetpassword',{
            email:result.email,
            hash:result.hash
          })
        } else {
          errors.push({ msg: 'Invalid link or link has been expired' });
          if (errors.length > 0) {
            res.render('forgot', {
              errors
            });
          }
        }
      });
    }
    else
    {
      errors.push({ msg: 'Invalid link or link has been expired' });
      if (errors.length > 0) {
        res.render('forgot', {
          errors
        });
      }
    }
  })
});


// Reset Password Change

router.post('/confirmpassword',function(req,res){
  const { password , cpassword , hash , email} = req.body;
  var pass = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  let errors = [];

  if (!password.match(pass)){
    errors.push({ msg: 'Password must contain minimum eight characters, at least one letter, one number and one special character' });
  }

  if (password != cpassword) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (errors.length > 0) {
    res.render('forgetpassword',{
      errors
    });
  } 
  else 
  {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(hash, salt, (err, newhash) => {
        if (err) throw err;
        else
        {
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, (err, newpassword) => {
              if (err) throw err;
              User.findOneAndUpdate({email:email,hash:hash},{password:newpassword,hash:newhash},function(err,result){
                if(err)
                  console(log)
                req.flash(
                  'success_msg',
                  'Password has been successfully reseted'
                );
                res.redirect('/users/login');
              })
            })
          })
        }
      })
    });
  }
})

module.exports = router;

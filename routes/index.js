var moment = require('moment');
var tz = require('moment-timezone');
//var Client = require("../iot-nodejs");
var exec = require('node-ssh-exec');
var config;
const fs = require('fs');

var args = process.argv.slice(2);

if (args == "l") {
  console.log('Reading local config.json file');
  fs.readFile('./config.json', 'utf8', function (err, data) {
      if (err) throw err;
      config = JSON.parse(data);
    })
  } else {
  console.log('Reading secret config file');
  fs.readFile('/run/secrets/config.json', 'utf8', function (err, data) {
      if (err) throw err;
      config = JSON.parse(data);
    });
}

moment.locale('en');

var day = new Date(); 
var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Devices = require('../models/devices');
var bCrypt = require('bcrypt-nodejs');

// Generates hash using bCrypt
var createHash = function(password){
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

function findAndUpdateUserStatus(req, done){
  console.log('User to change ' + req.deviceId);
  User.findOne({ 'deviceId' :  req.deviceId }, function(err, existingUser) {
    // In case of any error, return using the done method
    if (err){
       console.log('Error in finding user with deviceId: ' + req.deviceId + ', Message:  ' + err);
       return done(err);
    }
    // User not found
    if (!existingUser) {
       //console.log('User already exists with username: ' + req.param('username'));
       return done(true, req.user, 'User not found!');
    } else {
      // if there is no user with that email
      // create the user
      //var newUser = new User();
      // set the user's local credentials
      if (req.payload == 'entered') { 
          existingUser.atDesk = true;
      } else {
          existingUser.atDesk = false;
      }
      // save the new info
      //console.log('Updated User info ' + existingUser);

      existingUser.save(function(err) {
        if (err){
           console.log('Error in Saving user: '+err);
           throw err;
        }
        console.log('User info updated succesful');
        return done(false);
      });

    }
  });
}


function findOrCreateUser(req, done){ 
  User.findOne({ 'username' :  req.param('username') }, function(err, usernew) {
    // In case of any error, return using the done method
    if (err){
       console.log('Error in Registration: '+err);
       return done(err);
    }
    // already exists
    if (usernew) {
       //console.log('User already exists with username: ' + req.param('username'));
       return done(true, req.user, 'User already exists');
    } else {
      // if there is no user with that email
      // create the user
      var newUser = new User();
      // set the user's local credentials
      newUser.username = req.param('username');
      newUser.password = createHash(req.param('password'));
      newUser.email = req.param('email');
      newUser.firstName = req.param('firstName');
      newUser.lastName = req.param('lastName');
      newUser.company = req.param('company');
      newUser.role = req.param('role');
      newUser.active = (req.param('active') === 'active');

     // save the user
     newUser.save(function(err) {
       if (err){
          console.log('Error in Saving user: '+err);
          throw err;
       }
       console.log('Bank Registration succesful');
       return done(false);
     });
   }
 });
}

function findAndChangeUser(req, done){
  User.findOne({ 'username' :  req.param('username') }, function(err, oldUser) {
    // In case of any error, return using the done method
    if (err){
       console.log('Error in Registration: '+err);
       return done(err);
    }
    // already exists
    if (!oldUser) {
       //console.log('User already exists with username: ' + req.param('username'));
       return done(true, req.user, 'User already exists');
    } else {
      // if there is no user with that email
      // create the user
      //var newUser = new User();
      // set the user's local credentials
      oldUser.username = req.param('username');
      var unchanged = (req.param('password') == '');
      if (!unchanged) {
        oldUser.password = createHash(req.param('password'));
      }
      oldUser.email = req.param('email');
      oldUser.firstName = req.param('firstName');
      oldUser.lastName = req.param('lastName');
      oldUser.company = req.param('company');
      oldUser.role = req.param('role');
      oldUser.active = (req.param('active') === 'active');

     // save the user
     oldUser.save(function(err) {
       if (err){
          console.log('Error in Saving user: '+err);
          throw err;
       }
       console.log('Bank Registration succesful');
       return done(false);
     });
   }
 });
}


function findAndDeleteUser(req, done){
  User.findOne({ 'username' :  req.param('username') }, function(err, user) {
    // In case of any error, return using the done method
    if (err){
       console.log('Error in Deleting user: '+err);
       return done(err);
    }
    // already exists
    if (!user) {
       //console.log('User already exists with username: ' + req.param('username'));
       return done(true, req.user, 'No such user exists');
    } else {
     // remove the user
     user.remove(function(err) {
       if (err){
          console.log('Error in Deleting user: '+err);
          throw err;
       }
       console.log('User succesfully deleted');
       return done(false);
     });
   }
 });
}

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport){

	/* GET login page. */
	router.get('/', function(req, res) {
    	// Display the Login page with any flash message, if any
		res.render('index', { message: req.flash('message') });
	});

	/* Handle Login POST */
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/',
		failureFlash : true  
	}));

	/* GET Registration Page */
	router.get('/signup', function(req, res){
                console.log('new user: ' + req.user);
		res.render('register',{message: ''});
	});

	/* Handle Registration POST */
	router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash : true  
	}));

	/* GET Home Page */
	router.get('/home', isAuthenticated, function(req, res){
           if (req.user.role == 'admin') {
               Devices.find({}).lean().exec( function(err, devices) {
                   if (err) return console.error(err);
                   res.render('devices', { devices: devices, user: req.user});
                })
           } else {
               res.render('error', { message: 'You are not authorized for this action yet' });
           }
	});


       /* Active Devices List */
       router.get('/devices', isAuthenticated, function(req, res){
           if (req.user.role == 'admin') {
               Devices.find({}).lean().exec( function(err, devices) {
                   if (err) {
                       res.render('error', { message: 'Could not read device DB' });
                       return console.error(err);
                   } else {
                       res.render('devices', { devices: devices, user: req.user});
                   }
                }) 
           } else {
               res.render('error', { message: 'You are not authorized for this action yet' }); 
           }
       });

       /* Add/subtract devices */
       router.get('/addevices', isAuthenticated, function(req, res){
           if (req.user.role == 'admin') {
               Devices.count({}, function(err, count){
                  res.render('addevices', { count: count });
               })
           } else {
               res.render('error', { message: 'You are not authorized for this action yet' });
           }
       });

       router.post('/addevices', isAuthenticated, function(req,res){
           if (req.user.role == 'admin') {
               //console.log("Requested of devices: " + req.body.value);
               var
                   configuration = {
                       host: config.host,
                       username: config.username,
                       password: config.password
                   },
                   command = 'docker service scale client=' + req.body.value;
                   exec(configuration, command, function (error, response) {
                   if (error) {
                       throw error;
                   }
                   //console.log("Response from scale: " + response);
                   });
                   setTimeout(function () {
                       Devices.find({}).lean().exec( function(err, devices) {
                       if (err) return console.error(err);
                           res.render('devices', { devices: devices, user: req.user});
                   }, 4000); 
                })
           } else {
               res.render('error', { message: 'You are not authorized for this action yet' });
           }
       });

        /* test */
       router.get('#home', isAuthenticated, function(req, res){
                res.render('home', { user: req.user });
        });


	/* Handle Logout */
	router.get('/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	return router;

}

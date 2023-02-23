require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const fs = require("fs");
// const https = require("https");
// const options = {
//     key: fs.readFileSync('key.pem'),
//     cert: fs.readFileSync('cert.pem')
// }

// const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));
app.use(session({
    secret : "Our little Secret",
    resave: false,
    saveUninitialized : false
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', true);
mongoose.connect("mongodb://127.0.0.1:27017/userDB");
const userSchema = new mongoose.Schema( {
    email : String,
    password: String,
    facebookId : String,
    secret : String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://dead-blue-monkey-coat.cyclic.app/auth/google/secrets",
    userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//  passport.use(new FacebookStrategy({
//     clientID: process.env.APP_ID,
//     clientSecret: process.env.APP_SECRET,
//     callbackURL: "https://localhost:3000/fb/auth",
//     profileFields:['id','displayName']

//   },
//   function(accessToken, refreshToken, profile, cb) {
//     console.log(accessToken, refreshToken,profile)
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

app.get("/",(req,res)=>{
    res.render("home")
});
// app.use('/fb/auth', passport.authenticate('facebook',
//     {failureRedirect: '/login'}), function (req , res) {
//     //Successful authentication, redirect home.
//     res.redirect("secrets");
//     })
app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile"]
  }));
  app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("secrets");
  });

app.get("/login",(req,res)=>{
    res.render("login")
});


app.get("/register",(req,res)=>{
    res.render("register")
});

app.get("/secrets",(req,res)=>{
   User.find({secret:{$ne:null}},(err,foundUser)=>{
    if(err){
        console.log(err)
    }
    else{
        if(foundUser){
            res.render("secrets",{usersWithSecret:foundUser})
        }
    }
   })
})
app.get("/submit", (req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit")
    }
    else{
        res.redirect("/login")
    }

})
app.post("/submit",(req,res)=>{
    const submittedSecret = req.body.secret;
    const userId = req.user.id;
    User.findById(userId,(err,foundUser)=>{
        if(err){
            console.log(err)
        }
        else{
            foundUser.secret = submittedSecret,
            foundUser.save(()=>{
                res.redirect("/secrets")
            })
        }
    })

})
app.get("/logout",(req,res)=>{
req.logout((err)=>{
    if(err){
        console.log(err)
    }
    else{
        res.redirect("/")
    }
});

})


app.post("/register",(req,res)=>{
 User.register({username:req.body.username},req.body.password,(err,user)=>{
    if(err){
        console.log(err)
        res.redirect("/register")
    }
    else{
        passport.authenticate("local",{
            successRedirect: "/secrets",
            failureRedirect : "/register"
        })(req,res)
    }
 })

});
app.post("/login",(req,res)=>{
 const user = new User({
    username : req.body.username,
    password : req.body.password
 })

 req.login(user,(err)=>{
    if(err){
        console.log(err)
    }
    else{
        passport.authenticate("local",{
            successRedirect: "/secrets",
            failureRedirect : "/login"
        })(req,res)

    }
 })
});
    
            
// const server = https.createServer(options,requestListener);
// server.listen(3000);

app.listen(3000,()=>{
    console.log("server is listening on port 3000")
});


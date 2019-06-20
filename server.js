// server.js
// where your node app starts

// init project
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

// Mongoose
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const shortId = require('shortid');


//Connect to database
const uri = process.env.MONGOLAB_URI;
if (uri == null) {
  throw 'error: MongoDB uri is undefined!';
}
const options = { useMongoClient: true };

mongoose.Promise = global.Promise;
mongoose.connect(
  uri,
  options,
  (err) => {
    if (err) {
      console.log(err.message);
    } else {
      console.log('Successfully connected to database!');
    }
  }
);

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(bodyParser.urlencoded({'extended': false}));
app.use(cors());

// Schema
const userSchema = new Schema ({
  shortId: {type: String, unique: true, default: shortId.generate},
  username: String,
  exercise: [{
    desc : String,
    duration: Number,
    date : {}
  }]
});

var User = mongoose.model('User', userSchema);

const createUser = (name, done) => {
  User.findOne({username:name}, (err,findData)=>{
    if (findData == null){
      //no user currently, make new
      const user = new User({username : name, exercise : []});
      user.save((err,data)=>{
        if(err){
          done(err);
        }
        done(null , data);
      });
    }else if (err){
      done(err);
    }else{
      //username taken
      done(null,"taken");
    }
  });
};

const addExercise = (userId, activity, done) => {
  User.findOne({shortId:userId}, (err,data)=>{

    //add to array
    if (!data){
      done(null,'notFound');
    }else{
      if (data.exercise.length === 0) {
        data.exercise = data.exercise.concat([activity]);
      }else if (data.exercise.date == null){
          data.exercise.splice(0,0,activity);
      }else{
        let mark = 'pending';
        for (let i = 0; i<data.exercise.length; i++){
          if (activity.date < data.exercise[i].date){
            data.exercise.splice(i,0,activity);
            mark = 'done'
            break;
          }
        }
        if (mark === 'pending'){
         data.exercise = data.exercise.concat(activity); 
        }
      }       
      //save
      data.save((err, data) => {
        if (err) {
          console.log(err);
          done(err) 
        } else { 
          done(null, data) 
        }
      });
    }
 });
};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Validation
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

// http://expressjs.com/en/starter/basic-routing.html
app.get('/log/:userId', function(req, res) {
  User.findOne({
    shortId: req.params.userId
  }), (err, data) =>{
    if(data == null){
      res.send("User not found") 
    }else{
      if (data.exercise){
        var results = data.exercise;
        var start = new Date(req.query.from);
        var finish = new Date(req.query.limit);
      
        if(isValidDate(start)){
          results = results.filter(function(val){
            val.date >= start && val.date <= finish
          })
        }else if(isValidDate(finish)){
          results = results.filter(function(val){
            val.date >= start
          })
        }
      
      
        if(!isNaN(finish) && results.length > finish){
          results = results.slice(0, finish);
        }
      
        res.send({"exercise": results});
      }else{
        res.send("User doesn't have exercise registered.")
      }
    }
  }
});

app.post('/new-user', (req, res) =>{
  createUser(req.body.username, (err, saveData)=>{
    if(err){
      res.send(err)
    }else if(saveData === 'taken'){
      res.send("User already exists");
    }else{
      res.send({
        "username": saveData.username, 
        "id": saveData.shortId
      });
    }
  })
});

app.post('/add_exercise', function(req, res){

  var date = '';
  if(req.body.date != ''){
    date = new Date(req.body.date);
  }
  
  var exercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: date
  }
  
  addExercise(req.body.userId, exercise, function(err, saveData){
    if(err){
      res.send(err)
    }else if(saveData === 'notFound'){
      res.send("User not found")
    }else{
      res.send({
        "username": saveData.username,
        "description": exercise.description,
        "duration": exercise.duration,
        "id": saveData.shortId,
        "date": exercise.date
      })
    }
  });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

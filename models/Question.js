const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  catagory: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  code: {
    type: String,
  },
  user_id: {
    type: String,
    required: true
  },
  user_name: {
    type: String,
    required: true
  },
  views: {
    type: Number,
    required: true,
    default : 0
  },
  answer : {
    type: Number,
    required: true,
    default : 0
  }
});

const Question = mongoose.model('Question', QuestionSchema);

module.exports = Question;


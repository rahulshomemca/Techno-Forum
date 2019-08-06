const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  question_id: {
    type: String,
    required: true
  },
  question:{
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
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
  date: {
    type: Date,
    default: Date.now
  }
});

const Reply = mongoose.model('Reply', ReplySchema);

module.exports = Reply;


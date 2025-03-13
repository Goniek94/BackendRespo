import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  ad: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    minlength: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Eksport domyślny modelu Comment
const Comment = mongoose.model('Comment', commentSchema);
export default Comment;

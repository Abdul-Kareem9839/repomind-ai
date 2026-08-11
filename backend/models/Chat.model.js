import mongoose from 'mongoose';

const retrievedChunkSchema = new mongoose.Schema(
  {
    filepath: String,
    snippet: String,
    score: Number
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    question: {
      type: String,
      required: true
    },
    queryType: {
      type: String,
      enum: ['architecture', 'code_flow', 'bug_analysis', 'documentation', 'general_chat'],
      required: true
    },
    retrievedChunks: {
      type: [retrievedChunkSchema],
      default: []
    },
    toolsUsed: {
      type: [String],
      default: []
    },
    answer: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

chatSchema.index({ project: 1, createdAt: 1 });

export const Chat = mongoose.model('Chat', chatSchema);

export default Chat;

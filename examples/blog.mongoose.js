// Mongoose Blog Schema Example

const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    bio: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const CategorySchema = new Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true },
    description: String
});

const ArticleSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    tags: [String],
    viewCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    publishedAt: Date
});

const CommentSchema = new Schema({
    article: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    User: mongoose.model('User', UserSchema),
    Category: mongoose.model('Category', CategorySchema),
    Article: mongoose.model('Article', ArticleSchema),
    Comment: mongoose.model('Comment', CommentSchema)
};

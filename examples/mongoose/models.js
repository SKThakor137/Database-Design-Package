// Sample Mongoose / MongoDB Schemas
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const CourseSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    description: String,
    isPublished: Boolean
});

const EnrollmentSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrolledAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 }
});

module.exports = {
    Customer: mongoose.model('Customer', CustomerSchema),
    Course: mongoose.model('Course', CourseSchema),
    Enrollment: mongoose.model('Enrollment', EnrollmentSchema)
};

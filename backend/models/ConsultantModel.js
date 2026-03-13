const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const consultantSchema = new mongoose.Schema({
    fullName: { 
        type: String, 
        required: true,
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    barRegistration: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        enum: ['criminal', 'civil', 'corporate', 'family', 'intellectual', 'labor', 'tax', 'other'],
        required: true
    },
    professionalSummary: {
        type: String,
        maxlength: 200
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    totalClients: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
consultantSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
consultantSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON response
consultantSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('Consultant', consultantSchema);

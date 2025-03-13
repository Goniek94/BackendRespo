// src/models/user.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    // Weryfikujemy format numeru telefonu: + oraz 11-18 znaków (prefix + numer)
    validate: {
      validator: function(v) {
        return /^\+\d{2,4}\d{9,14}$/.test(v);
      },
      message: props => `${props.value} nie jest prawidłowym numerem telefonu!`
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  dob: {
    type: Date,
    required: true,
    // Walidacja wieku (16-100 lat)
    validate: {
      validator: function(date) {
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
          age--;
        }
        return age >= 16 && age <= 100;
      },
      message: 'Musisz mieć co najmniej 16 lat i maksymalnie 100 lat.'
    }
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  is2FAEnabled: {
    type: Boolean,
    default: false
  },
  twoFACode: {
    type: String,
    default: null
  },
  twoFACodeExpires: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Haszowanie hasła przed zapisem
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Dodaj metodę do formatowania daty w formacie YYYY-MM-DD
userSchema.methods.getFormattedDOB = function() {
  if (!this.dob) return null;
  
  const day = String(this.dob.getDate()).padStart(2, '0');
  const month = String(this.dob.getMonth() + 1).padStart(2, '0'); // Miesiące zaczynają się od 0
  const year = this.dob.getFullYear();
  
  return `${year}-${month}-${day}`;
};

// Dodaj metodę do formatowania numeru telefonu (opcjonalnie z separacją prefiksu)
userSchema.methods.getFormattedPhone = function(separatePrefix = false) {
  if (!this.phoneNumber) return null;
  
  if (!separatePrefix) {
    return this.phoneNumber;
  }
  
  // Wydziel prefiks (+XX) i resztę numeru
  const match = this.phoneNumber.match(/^(\+\d{2,4})(\d+)$/);
  if (match) {
    return {
      prefix: match[1],
      number: match[2]
    };
  }
  
  return this.phoneNumber;
};

export default mongoose.model('User', userSchema);
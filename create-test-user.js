// Test foydalanuvchi yaratish uchun script
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/stitch-omr', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB ga ulandi');
  } catch (error) {
    console.error('❌ MongoDB ulanish xatosi:', error);
    process.exit(1);
  }
};

// User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'teacher' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Test foydalanuvchilarni yaratish
const createTestUsers = async () => {
  try {
    await connectDB();
    
    // Mavjud test foydalanuvchilarni o'chirish
    await User.deleteMany({ phone: { $in: ['+998944505455', '+998901234567'] } });
    console.log('🗑️ Eski test foydalanuvchilar o\'chirildi');
    
    // Test foydalanuvchilar
    const testUsers = [
      {
        name: 'Test Teacher',
        phone: '+998944505455',
        password: '147258369',
        role: 'teacher'
      },
      {
        name: 'Demo User',
        phone: '+998901234567',
        password: 'test123456',
        role: 'teacher'
      }
    ];
    
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Foydalanuvchi yaratildi: ${userData.name} (${userData.phone})`);
    }
    
    console.log('🎉 Barcha test foydalanuvchilar yaratildi!');
    
    // Test login
    const testUser = await User.findOne({ phone: '+998944505455' }).select('+password');
    if (testUser) {
      const isPasswordValid = await testUser.comparePassword('147258369');
      console.log(`🔐 Parol tekshiruvi: ${isPasswordValid ? 'TO\'G\'RI' : 'NOTO\'G\'RI'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
};

createTestUsers();
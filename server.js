const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('.'));

// ملف لحفظ البيانات
const DATA_FILE = 'attendance_data.json';

// تحميل البيانات من الملف
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('📁 إنشاء ملف بيانات جديد');
    }
    return { users: [], attendance: [] };
}

// حفظ البيانات في الملف
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// بيانات المستخدمين الافتراضية
const defaultUsers = [
    { 
        username: 'admin', 
        password: 'admin123', 
        fullName: 'مدير النظام', 
        role: 'مدير', 
        joinDate: new Date().toISOString(), 
        isActive: true 
    },
    { 
        username: 'ahmed', 
        password: '123456', 
        fullName: 'أحمد محمد', 
        role: 'طالب', 
        joinDate: new Date().toISOString(), 
        isActive: true 
    },
    { 
        username: 'fatima', 
        password: '111111', 
        fullName: 'فاطمة عبدالله', 
        role: 'طالبة', 
        joinDate: new Date().toISOString(), 
        isActive: true 
    }
];

// تسجيل مستخدم جديد
app.post('/api/register', (req, res) => {
    const { username, password, fullName, role } = req.body;
    const data = loadData();
    
    // إذا كان أول استخدام، أنشئ المستخدمين الافتراضيين
    if (data.users.length === 0) {
        data.users = defaultUsers;
        saveData(data);
    }
    
    // التحقق من البيانات
    if (!username || !password || !fullName || !role) {
        return res.json({ 
            success: false, 
            message: 'جميع الحقول مطلوبة' 
        });
    }
    
    // التحقق من طول كلمة المرور
    if (password.length < 4) {
        return res.json({ 
            success: false, 
            message: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' 
        });
    }
    
    // التحقق من عدم تكرار اسم المستخدم
    if (data.users.find(u => u.username === username)) {
        return res.json({ 
            success: false, 
            message: 'اسم المستخدم موجود مسبقاً' 
        });
    }
    
    // إضافة المستخدم الجديد
    const newUser = {
        id: Date.now(),
        username,
        password,
        fullName,
        role,
        joinDate: new Date().toISOString(),
        isActive: true
    };
    
    data.users.push(newUser);
    saveData(data);
    
    console.log('✅ تم تسجيل مستخدم جديد:', username);
    
    res.json({ 
        success: true, 
        message: 'تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول'
    });
});

// تسجيل الدخول
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();
    
    // إذا كان أول استخدام، أنشئ المستخدمين الافتراضيين
    if (data.users.length === 0) {
        data.users = defaultUsers;
        saveData(data);
    }
    
    const user = data.users.find(u => u.username === username && u.password === password && u.isActive);
    
    if (user) {
        res.json({ 
            success: true, 
            username: user.username, 
            fullName: user.fullName,
            role: user.role 
        });
    } else {
        res.json({ 
            success: false, 
            message: 'بيانات الدخول غير صحيحة' 
        });
    }
});

// تسجيل الحضور
app.post('/api/attendance', (req, res) => {
    const { username, latitude, longitude, period } = req.body;
    const data = loadData();
    
    // البحث عن المستخدم
    const user = data.users.find(u => u.username === username);
    if (!user) {
        return res.json({ 
            success: false, 
            message: 'المستخدم غير موجود' 
        });
    }
    
    const record = {
        id: Date.now(),
        username,
        fullName: user.fullName,
        latitude,
        longitude,
        period,
        timestamp: new Date().toLocaleString('ar-SA'),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ar-SA')
    };
    
    data.attendance.push(record);
    saveData(data);
    
    console.log('✅ تم تسجيل الحضور:', username, period);
    
    res.json({ 
        success: true, 
        message: `تم تسجيل الحضور ${period} بنجاح`,
        record 
    });
});

// الحصول على سجلات الحضور
app.get('/api/attendance', (req, res) => {
    const data = loadData();
    res.json(data.attendance);
});

// الحصول على قائمة المستخدمين
app.get('/api/users', (req, res) => {
    const data = loadData();
    
    // إرجاع المستخدمين بدون كلمات المرور
    const usersWithoutPasswords = data.users.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        joinDate: user.joinDate,
        isActive: user.isActive
    }));
    
    res.json(usersWithoutPasswords);
});

// الحصول على الإحصائيات
app.get('/api/stats', (req, res) => {
    const data = loadData();
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
        totalRecords: data.attendance.length,
        totalUsers: data.users.length,
        todayRecords: data.attendance.filter(r => r.date === today).length,
        uniqueUsers: [...new Set(data.attendance.map(r => r.username))].length
    };
    
    res.json(stats);
});

// حذف مستخدم
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const data = loadData();
    
    const userIndex = data.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return res.json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    // لا يمكن حذف المستخدم إذا كان لديه سجلات حضور
    const userRecords = data.attendance.filter(r => r.username === username);
    if (userRecords.length > 0) {
        return res.json({ 
            success: false, 
            message: 'لا يمكن حذف المستخدم لأنه لديه سجلات حضور' 
        });
    }
    
    // حذف المستخدم
    data.users.splice(userIndex, 1);
    saveData(data);
    
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
});

// الحصول على سجلات الحضور مع معلومات المستخدمين
app.get('/api/records', (req, res) => {
    const data = loadData();
    
    const recordsWithUserInfo = data.attendance.map(record => {
        const user = data.users.find(u => u.username === record.username);
        return {
            ...record,
            fullName: user ? user.fullName : record.username,
            userRole: user ? user.role : 'غير معروف'
        };
    });
    
    res.json(recordsWithUserInfo);
});

// تحديث بيانات المستخدم
app.put('/api/users/:username', (req, res) => {
    const { username } = req.params;
    const { fullName, role, isActive } = req.body;
    const data = loadData();
    
    const userIndex = data.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return res.json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    // تحديث البيانات
    if (fullName) data.users[userIndex].fullName = fullName;
    if (role) data.users[userIndex].role = role;
    if (typeof isActive !== 'undefined') data.users[userIndex].isActive = isActive;
    
    saveData(data);
    
    res.json({ success: true, message: 'تم تحديث بيانات المستخدم' });
});

// تغيير كلمة المرور
app.post('/api/change-password', (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    const data = loadData();
    
    const userIndex = data.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return res.json({ success: false, message: 'المستخدم غير موجود' });
    }
    
    // التحقق من كلمة المرور الحالية
    if (data.users[userIndex].password !== currentPassword) {
        return res.json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }
    
    // تحديث كلمة المرور
    data.users[userIndex].password = newPassword;
    saveData(data);
    
    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
});

// الحصول على سجلات مستخدم معين
app.get('/api/attendance/:username', (req, res) => {
    const { username } = req.params;
    const data = loadData();
    
    const userRecords = data.attendance.filter(record => record.username === username);
    
    res.json(userRecords);
});

// صفحة الإدارة
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// خدمة الملفات الثابتة
app.use(express.static(__dirname));

// بدء الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('🚀 السيرفر شغال على http://localhost:' + PORT);
    console.log('💾 البيانات تحفظ في ملف: ' + DATA_FILE);
    console.log('📊 لوحة التحكم: http://localhost:' + PORT + '/admin.html');
    console.log('👤 المستخدمين الافتراضيين:');
    console.log('   - admin / admin123 (مدير)');
    console.log('   - ahmed / 123456 (طالب)');
    console.log('   - fatima / 111111 (طالبة)');
});

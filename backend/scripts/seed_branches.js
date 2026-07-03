require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Branch = require('../models/Branch');

const branches = [
  {
    branchName: 'Hyderabad Branch',
    location: 'Hyderabad',
    address: 'Plot No. 12, Madhapur Industrial Area, Hyderabad, Telangana',
    phone: '+91 9876543210',
    status: 'active',
    managerName: 'Rajesh Kumar',
  },
  {
    branchName: 'Mumbai Branch',
    location: 'Mumbai',
    address: 'Sector 8, Andheri East, Mumbai, Maharashtra',
    phone: '+91 9865321478',
    status: 'active',
    managerName: 'Priya Sharma',
  },
  {
    branchName: 'Bangalore Branch',
    location: 'Bengaluru',
    address: 'No. 45, Electronic City Phase 1, Bengaluru, Karnataka',
    phone: '+91 9848012345',
    status: 'active',
    managerName: 'Anil Reddy',
  },
  {
    branchName: 'Chennai Branch',
    location: 'Chennai',
    address: '22, Guindy Industrial Estate, Chennai, Tamil Nadu',
    phone: '+91 9988776655',
    status: 'active',
    managerName: 'Kiran Patel',
  },
  {
    branchName: 'Vijayawada Branch',
    location: 'Vijayawada',
    address: '14-3-21, Auto Nagar, Vijayawada, Andhra Pradesh',
    phone: '+91 9123456780',
    status: 'active',
    managerName: 'Suresh Rao',
  },
  {
    branchName: 'Pune Branch',
    location: 'Pune',
    address: 'Plot No. 18, Hinjewadi Phase 2, Pune, Maharashtra',
    phone: '+91 9012345678',
    status: 'active',
    managerName: 'Deepak Jain',
  },
  {
    branchName: 'Visakhapatnam Branch',
    location: 'Visakhapatnam',
    address: 'D.No. 10-1-5, Gajuwaka Industrial Area, Visakhapatnam, Andhra Pradesh',
    phone: '+91 9988123456',
    status: 'active',
    managerName: 'Mahesh Gupta',
  },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    for (const data of branches) {
      const exists = await Branch.findOne({ branchName: data.branchName });
      if (!exists) {
        await Branch.create(data);
        console.log(`Created ${data.branchName}`);
      } else {
        console.log(`${data.branchName} already exists`);
      }
    }
    console.log('Branch seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding branches:', err);
    process.exit(1);
  }
})();

// Simple script to get your current public IP address for MongoDB Atlas whitelisting
const https = require('https');

console.log('🌐 Getting your current public IP address...\n');

https.get('https://api.ipify.org?format=json', (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const ipInfo = JSON.parse(data);
            console.log('📍 Your current public IP address is:');
            console.log(`   ${ipInfo.ip}`);
            console.log('\n🔧 To fix the MongoDB connection:');
            console.log('1. Go to MongoDB Atlas dashboard');
            console.log('2. Navigate to "Network Access"');
            console.log('3. Click "Add IP Address"');
            console.log('4. Add this IP address: ' + ipInfo.ip);
            console.log('5. Or use "0.0.0.0/0" to allow all IPs (less secure)');
            console.log('\n✅ After adding your IP, restart your server');
        } catch (error) {
            console.error('❌ Error parsing IP response:', error.message);
        }
    });
}).on('error', (error) => {
    console.error('❌ Error getting IP address:', error.message);
    console.log('\n🔧 Manual steps:');
    console.log('1. Visit https://whatismyipaddress.com/');
    console.log('2. Copy your public IP address');
    console.log('3. Add it to MongoDB Atlas Network Access');
});

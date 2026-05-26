const axios = require('axios');

async function testRegister() {
    try {
        const payload = {
            businessName: "Test Store",
            ownerName: "Test Owner",
            email: "test_register@rana.com",
            password: "password123",
            waNumber: "081234567890",
            category: "Lainnya",
            latitude: -6.2,
            longitude: 106.8,
            address: "Test Address"
        };
        const response = await axios.post('http://localhost:4000/api/auth/register', payload);
        console.log("Success:", response.data);
    } catch (error) {
        if (error.response) {
            console.error("Error Status:", error.response.status);
            console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
    }
}

testRegister();

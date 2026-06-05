const https = require('https');
const fs = require('fs');
const url = 'https://cdn.gemini.googleusercontent.com/multimodal-file-data/cfc63751-1ae8-4896-bd18-becd2cdcda4b/8d4d8b94-1a77-4c45-9856-11f884260f33.png';
const file = fs.createWriteStream('c:/Users/MSI/Desktop/ООО Чалама/backend/public/uploads/max_new.png');

const options = {
  rejectUnauthorized: false
};

https.get(url, options, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download Completed');
  });
}).on('error', (err) => {
  console.error('Error: ' + err.message);
});



const {
	dnsChk,
	get
} = require('../lib/dns-chk-https-get.js');



const options = {
	url: 'https://labjack.com/sites/default/files/styles/products_homepage/public/U3HV_white_shadow.JPG',
	reqContentType: 'image/jpeg',
	maxHdrSize: 800,
	port: 443,
};

get(options, function(err, res) {
	if(err) {
		console.error('Received Error:',err);
	} else {
		console.log('Received result', res.length);
	}
});


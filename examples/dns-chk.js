
const {
	dLookup,
	cfLookup,
	gLookup,
	q9Lookup,
	dnsChk
} = require('../lib/dns-chk-https-get.js');
const dns = require('dns');
// dLookup('labjack.com', {all: true, family: 6}, (err, res, family) => {
// 	console.log('D Result:',err, res);
// })
// cfLookup('labjack.com', {all: true, family: 6}, (err, res, family) => {
// 	console.log('CF Result:',err, res);
// })
// gLookup('labjack.com', {all: true, family: 6}, (err, res, family) => {
// 	console.log('G Result:',err, res);
// })
// q9Lookup('labjack.com', {all: true, family: 4}, (err, res, family) => {
// 	console.log('Q9 Result:',err, res);
// })
// odLookup('labjack.com', {all: true, family: 4}, (err, res, family) => {
// 	console.log('OD Result:',err, res);
// })
// dns.lookup('labjack.com', {all:true, family:4}, (err, ip, family) => {
// 	console.log('N Res:', err, ip, family);
// })

console.log('Getting & Checking');
dnsChk('labjack.com', (err, ip) => {
	console.log('DNS Check Res:', err, ip);
});

// cfLookup('labjack.com', {all: false, family: 6}, (err, res, family) => {
// 	console.log('CF Result:',err, res, family);
// })
// gLookup('labjack.com', {all: false, family: 6}, (err, res, family) => {
// 	console.log('G Result:',err, res, family);
// })
// dns.lookup('labjack.com', {all:false, family:6}, (err, ip, family) => {
// 	console.log('N Res:', err, ip, family);
// })


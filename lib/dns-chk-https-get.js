
const dns = require('dns');
const httpsGet = require('ip-https-get').get;
const dnsPacket = require('dns-packet');
const async = require('async');
const url = require('url');

const DEBUG_OUT = false;

function getDebugger(enabled) {
	return function() {
		if(enabled) {
			console.log.apply(null, arguments);
		}
	}
}
const debug = getDebugger(DEBUG_OUT);

function base64StrEncode(str) {
    let buff = Buffer.alloc(str.length);
    buff.fill(str);
    let base64Str = buff.toString('base64');
    base64Str = base64Str.replace('=','').replace('+','-').replace('/','_')
    return base64Str
}

function parseJSONReq(opts, res, cb) {
	let retRes = JSON.parse(res);
	if(retRes['Answer'].length === 0) {
		cb(Error('No results for: '+opts.hostname), null);
		return;
	}
	let pRes = [null, null, null];

	if(opts.all) {
		pRes[1] = [];
		retRes['Answer'].forEach(function(ipRes) {
			pRes[1].push({address: ipRes.data, family: opts.family});
		});
	} else {
		pRes[1] = retRes['Answer'][0].data;
		pRes[2] = opts.family;
	}

	cb.apply(this, pRes);
}

function parseDNSReq(opts, res, cb) {
	debug('rx raw data',res);
	let retRes = dnsPacket.decode(res);

	if(retRes['questions'].length === 0) {
		cb(Error('No results for: '+opts.hostname), null);
		return;
	}
	let pRes = [null, null, null];

	if(opts.all) {
		pRes[1] = [];
		retRes['questions'].forEach(function(ipRes) {
			pRes[1].push({address: ipRes.name, family: opts.family});
		});
	} else {
		pRes[1] = retRes['questions'][0].data;
		pRes[2] = opts.family;
	}

	cb.apply(this, pRes);
}

function lookupLoop(opts, cb) {
	opts.ip = opts.ips[opts.index];

	httpsGet(opts, function(err, res) {
		debug('Got Data:', err, res);
		if (err) {
			if(opts.index < opts.ips.length -1) {
				opts.index += 1;
				lookupLoop(opts, cb);
			} else {
				cb(err, null);
			}
		} else {
			if(opts.reqContentType === 'application/dns-message') {
				parseDNSReq(opts, res, cb);
			} else {
				parseJSONReq(opts, res, cb);
				
			}
		}
	});
}

function parseArguments(args) {
	const parsedArgs = {
		hostname: '',
		family: 4,
		all: false,
		type: 'A',
		cb: null,
	};

	if(args.length == 2) {
		if (typeof args[0] !== 'string') { throw new Error('First argument should be a string (hostname)'); }
		if (typeof args[1] !== 'function') { throw new Error('Second argument should be a function (callback)'); }
		parsedArgs.hostname = args[0];
		parsedArgs.cb = args[1];
	} else if(args.length = 3) {
		if (typeof args[0] !== 'string') { throw new Error('First argument should be a string (hostname)'); }
		if (typeof args[2] !== 'function') { throw new Error('Second argument should be a function (callback)'); }
		parsedArgs.hostname = args[0];
		parsedArgs.cb = args[2];
		if(args[1].family) {
			if (typeof args[1].family !== 'number') { throw new Error('"family" option should be a number'); }
			parsedArgs.family = args[1].family;
		}
		if(args[1].all) {
			if (typeof args[1].all !== 'boolean') { throw new Error('"all" option should be a number'); }
			parsedArgs.all = args[1].all;
		}
	} else {
		throw new Error('Invalid number of passed arguments');
	}

	if (parsedArgs.family == 4) {
		parsedArgs.type = 'A';
	} else if(parsedArgs.family == 6) {
		parsedArgs.type = 'AAAA';
	}
	return parsedArgs;
}

const cfHeaders = {
	'Host': 'cloudflare-dns.com',
	'Accept': 'application/dns-json',
};

const dohOpts = [
	{port: 443, ip: '1.1.1.1', hostname: 'cloudflare-dns', headers: cfHeaders, qryStr: 'dns-query'},
	{port: 443, ip: '1.0.0.1', hostname: 'cloudflare-dns', headers: cfHeaders, qryStr: 'dns-query'},
	{port: 443, ip: '8.8.8.8', hostname: 'dns.google', qryStr: 'resolve'},
	{port: 443, ip: '8.8.4.4', hostname: 'dns.google', qryStr: 'resolve'},
	{port: 5053, ip: '9.9.9.9', hostname: 'dns.quad9.net', qryStr: 'resolve'},
	{port: 5053, ip: '149.112.112.112', hostname: 'dns.quad9.net', qryStr: 'resolve'},
];

function bulkLookup(hostname, cb) {
	const pOpts = parseArguments(arguments);

	const dnsPktBuf = dnsPacket.encode({
		type:'query',
		id: 1,
		flags:0,
		questions: [{
			type: pOpts.type,
			name: pOpts.hostname,
		}]
	});
	const queryStr = base64StrEncode(dnsPktBuf);

	const httpOpts = {
		port: 443,
		ips:['1.1.1.1','1.0.0.1'],
		index: 0,
		hostname: 'cloudflare-dns.com',
		path: `/dns-query?dns=${queryStr}`,
		family: pOpts.family,
		all: pOpts.all,
		reqContentType: 'application/dns-message',
	};
	lookupLoop(httpOpts, pOpts.cb);
};

function dLookup(hostname, cb) {
	const pOpts = parseArguments(arguments);

	const dnsPktBuf = dnsPacket.encode({
		type:'query',
		id: 1,
		flags:0,
		questions: [{
			type: pOpts.type,
			name: pOpts.hostname,
		}]
	});
	const queryStr = base64StrEncode(dnsPktBuf);

	const httpOpts = {
		port: 443,
		// ips:['1.1.1.1','1.0.0.1'],
		ips:['208.67.220.220'],
		index: 0,
		// hostname: 'cloudflare-dns.com',
		hostname: 'doh.opendns.com',
		path: `/dns-query?dns=${queryStr}`,
		family: pOpts.family,
		all: pOpts.all,
		reqContentType: 'application/dns-message',
	};
	lookupLoop(httpOpts, pOpts.cb);
}

function cfLookup(hostname, cb) {
	const pOpts = parseArguments(arguments);

	const cfOpts = {
		port:443,
		ips:['1.1.1.1','1.0.0.1'],
		index: 0,
		hostname: 'cloudflare-dns.com',
		headers: {
			'Host': 'cloudflare-dns.com',
			'Accept': 'application/dns-json',
		},
		path: `/dns-query?name=${pOpts.hostname}&type=${pOpts.type}`,
		family: pOpts.family,
		all: pOpts.all,
		reqContentType: 'application/dns-json',
	};

	lookupLoop(cfOpts, pOpts.cb);
}

function gLookup(hostname, cb) {
	const pOpts = parseArguments(arguments);

	const cfOpts = {
		port:443,
		ips:['8.8.8.8','8.8.4.4'],
		index: 0,
		hostname: 'dns.google',
		path: `/resolve?name=${hostname}&type=${pOpts.type}&do=1`,
		family: pOpts.family,
		all: pOpts.all,
		reqContentType: 'application/dns-json',
	};
	
	lookupLoop(cfOpts, pOpts.cb);
}

function q9Lookup(hostname, cb) {
	const pOpts = parseArguments(arguments);

	const cfOpts = {
		port:5053,
		ips:['2620:fe::fe','9.9.9.9'],
		index: 0,
		hostname: 'quad9.net',
		path: `/dns-query?name=${hostname}&type=${pOpts.type}&do=1`,
		family: pOpts.family,
		all: pOpts.all,
		reqContentType: 'application/json; charset=UTF-8',
	};
	
	lookupLoop(cfOpts, pOpts.cb);
}

function odLookup(hostname, cb) {
	const pOpts = parseArguments(arguments);

	const cfOpts = {
		port:853,
		ips:['208.67.220.220'],
		index: 0,
		hostname: 'opendns.com',
		headers: {
			'Host': 'opendns.com',
			'Accept': 'application/dns-json',
		},
		path: `/dns-query?name=${hostname}&type=${pOpts.type}&do=1`,
		family: pOpts.family,
		all: pOpts.all,
		reqContentType: 'application/json; charset=UTF-8',
	};
	
	lookupLoop(cfOpts, pOpts.cb);
}


/*
 * dnsChk: Use the DNS service to get an IP address for a
 * domain and attempt to verify the IP address using DoH 
 * services.
 */
function dnsChk(hostname, cb) {
	const pOpts = parseArguments(arguments);

	let dnsResIP = null;
	let dohCheckedIPs = [];
	let dohServices = [
		cfLookup,
		gLookup,
		q9Lookup
	];

	dns.lookup(hostname, {family: pOpts.family}, function cb(err, ip, family) {
		dnsResIP = ip;
	})

	async.each(dohServices,
		function(dnsService, callback) {
			dnsService(hostname, {family: pOpts.family, all: true},
				function(err, ip, family) {
					if(err) {
						callback();
					} else {
						ip.forEach(function(ipObj) {
							dohCheckedIPs.push(ipObj.address);
						});
						callback();
					}
				});
		},
		function fin(err) {
			if(dohCheckedIPs.indexOf(dnsResIP) >= 0) {
				cb(null, dnsResIP);
			} else {
				let msg = `IP: ${dnsResIP} not verified by DoH services.`
				cb(msg, dnsResIP);
			}
		});
}


function get(options, cb) {
	if (typeof options.url !== 'string') { throw new Error('Missing Arg: options.url'); }

	let urlInfo = url.parse(options.url);
	dnsChk(urlInfo.hostname, function(err, ip) {
		if(err) {
			cb(err, null);
		} else {
			let getOpts = {
				ip: ip,
				hostname: urlInfo.hostname,
				path: urlInfo.path,
			};

			let optionKeys = Object.keys(options);
			optionKeys.forEach(function(key) {
				getOpts[key] = options[key];
			});

			httpsGet(getOpts, cb);
		}
	});
}
module.exports = {
	dLookup,
	cfLookup,
	gLookup,
	q9Lookup,
	odLookup,
	dnsChk,
	get
};
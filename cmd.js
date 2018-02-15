var os = require('os');
var stdin = process.openStdin();

stdin.addListener("data", function(data) {
	console.log(os.networkInterfaces());
	require('dns').lookup(os.hostname(), function (err, add, fam) {
		console.log('addr: '+add);
	})
	console.log("you entered: [" + data.toString().trim() + "]");
});

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
require('./cmd.js');
var User = require('./user.js');

var fs = require('fs');
var path = require('path');


/*app.get(/^\/data\/maps/, function(req, res){
	if(/\.\./g.test(req.url))
		return res.status(404).end();
	
	if(!fs.existsSync('./game' + req.url))
		return res.status(404).end();
	
	if(fs.lstatSync('./game' + req.url).isDirectory())
		return res.status(404).end();
	
	var raw = fs.readFileSync('./game' + req.url);
	var data = JSON.parse(raw);
	
	data.entities = data.entities.filter(function(entity){
		return entity.type !== "Enemy"
	});
	
	res.set({
		'Access-Control-Allow-Origin': '*',
		'Content-Type': 'application/json'
		});
	res.send(JSON.stringify(data));
})*/

var gameFolder = path.resolve('./game');

app.get(['^/data/*', '^/media/*'], function(req, res){
	var file = path.resolve('./game' + req.url);

	if(file.indexOf(gameFolder) !== 0)
		return res.status(404).end();

	if(!fs.existsSync(file))
		return res.status(404).end();
	
	if(fs.lstatSync(file).isDirectory())
		return res.status(404).end();
	
	res.set({'Access-Control-Allow-Origin': '*'});
	res.sendFile(file);
});

app.get(/^(?!(\/media\/|\/data\/))/g, function(req, res){
	res.status(404).end();
});

io.on('connection', function(socket){ new User(socket) });

http.listen(1423, function(){
	console.log('listening on *:1423');
});

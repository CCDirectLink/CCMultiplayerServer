var utilities = require('./userUtilities.js');

var users = {};
var sockets = {};
var host = undefined;

var entities = [];

function User(socket){
	sockets[socket.id] = {
		pos:{x:-1,y:-1,z:-1},
		socket: this,
		currentMap: undefined,
		name: undefined,
		id: socket.id
		};
	var user;
	var id = socket.id;
	
	console.log('[Socket] A user connected: ' + socket.id);
	if(!host) {
		host = sockets[socket.id];
		console.log('[Socket] First user is hosting: ' + socket.id);
	}

	function onConnect(){
		console.log('[User] <' + user.name + '> connected!');
	}
	function onDisconnect(){
		save();
		console.log('[User] <' + user.name + '> disconnected!');
	}

	function save(){
		
	}
	
	function isOnMap(player, map){
		if(!map || !player || !users[player] || !users[player].name)
			return false;
		return users[player].currentMap === map;
	}
	
	function isHost(){
		return host.id === socket.id;
	}
	
	socket.on('identify', function(name){
		console.log("[Socket] A user identified as: " + name);
		if(utilities.checkIfUserExists(name)){
			socket.emit('identified', {failed: "User already exists"});
		}else{
			socket.emit('identified', {success: name, isHost: host.id === socket.id});
			user = users[name] = sockets[socket.id];
			user.name = name;
			onConnect();
		}
	});
	socket.on('disconnect', function(){
		if(user && user.name){
			onDisconnect();
			users[user.name] = undefined;
		}
		sockets[socket.id] = undefined;
		console.log('[Socket] A user disconnected: ' + socket.id);
		if(isHost()) {
			console.log('[Socket] Host disconnected: ' + socket.id + (host.name ? (" <" + host.name + ">") : ""));
			host = undefined;
			for(var id in sockets){
				if(sockets[id]){
					host = sockets[id];
					console.log('[Socket] New host found: ' + host.id + (host.name ? (" <" + host.name + ">") : ""));
					break;
				}
			}
		}

	});
	socket.on('changeMap', function(data){
		if(!user)
			return;

		var name = data.name;
		var marker = data.marker;
		
		console.log('[User] <' + user.name + '> has changed map to: ' + name);
		for(var playerName in users){
			if(playerName === user.name || !users[playerName])
				continue;
			if(isOnMap(playerName, name)){
				user.socket.onPlayerChangeMap(playerName, true, users[playerName].pos, name, marker);
				users[playerName].socket.onPlayerChangeMap(user.name, true, user.pos, name, marker);
				
				for(var i in entities){
					var entity = entities[i];
					
					if(entity && entity.id){
						user.socket.registerEntity(entity.id, entity.type, entity.pos, entity.settings);
						users[playerName].socket.registerEntity(entity.id, entity.type, entity.pos, entity.settings);
					}
				}
				
				console.log("  Informed user: " + playerName);
				console.log("  Informed user: " + user.name);
			}else if(isOnMap(playerName, user.currentMap)){
				users[playerName].socket.onPlayerChangeMap(user.name, false, undefined, name, marker);
				console.log("  Informed user: " + playerName);
			}else{
				console.log("  Didn't inform user: " + playerName);
			}
		}
		user.currentMap = name;
	});
	socket.on('updatePosition', function(pos){
		if(!user)
			return;

		user.pos = pos;
		for(var playerName in users){
			if(isOnMap(playerName, user.currentMap)){
				users[playerName].socket.updatePosition(user.name);
			}
		}
	});
	socket.on('updateAnimation', function(data){
		if(!user)
			return;

		for(var playerName in users){
			if(isOnMap(playerName, user.currentMap)){
				users[playerName].socket.updateAnimation(user.name, data);
			}
		}
	});
	socket.on('updateAnimationTimer', function(timer){
		if(!user)
			return;

		for(var playerName in users){
			if(isOnMap(playerName, user.currentMap)){
				users[playerName].socket.updateAnimationTimer(user.name, timer);
			}
		}
	});
	socket.on('spawnEnity', function(entity){
		//console.log(entity.type)
		/*for(var playerName in users){
			if(isOnMap(playerName, user.currentMap)){
				users[playerName].socket.updateAnimationTimer(user.name, timer);
			}
		}*/
	});
	socket.on('registerEntity', function(data){
		if(!user)
			return;

		if(isHost()){
			if(data.type !== "Enemy")
				return;
			
			entities[data.id] = data;

			if(data.settings)
				data.settings.multiplayerId = data.id;
			else
				data.settings = {multiplayerId: data.id};
			
			for(var playerName in users){
				if(!users[playerName] || users[playerName] === user)
					continue;
				
				if(isOnMap(playerName, user.currentMap))
					users[playerName].socket.registerEntity(data.id, data.type, data.pos, data.settings);
			}
			
			console.log('registered enitity "' + data.type + '" with id "' + data.id + '". There are now ' + Object.keys(entities).length + ' entities registered'); 
		}
	});
	socket.on('updateEntityPosition', function(data){
		if(!user)
			return;

		if(isHost()){
			if(!data.pos){
				console.warn("Tried to move to undefined");
				return;
			}
			
			if(!entities[data.id]){
				console.warn("Tried to move an not existing entity '" + data.id + "'");
				return;
			}
			
			entities[data.id].pos = data.pos;
			for(var playerName in users){
				if(!users[playerName] || users[playerName] === user)
					continue;
				
				if(isOnMap(playerName, user.currentMap))
					users[playerName].socket.updateEntityPosition(data.id, data.pos);
			}
		}
	});
	socket.on('updateEntityAnimation', function(data){
		if(!user)
			return;

		if(isHost()){
			if(!entities[data.id]){
				console.warn("Tried to move an not existing entity '" + data.id + "'");
				return;
			}
			
			entities[data.id].face = data.face;
			entities[data.id].anim = data.anim;
			for(var playerName in users){
				if(!users[playerName] || users[playerName] === user)
					continue;
				
				if(isOnMap(playerName, user.currentMap))
					users[playerName].socket.updateEntityAnimation(data.id, data.face, data.anim);
			}
		}
	});
	socket.on('updateEntityState', function(data){
		if(!user)
			return;

		if(isHost()){
			if(!entities[data.id]){
				console.warn("Tried to move an not existing entity '" + data.id + "'");
				return;
			}
			
			entities[data.id].state = data.state;
			for(var playerName in users){
				if(!users[playerName] || users[playerName] === user)
					continue;
				
				if(isOnMap(playerName, user.currentMap))
					users[playerName].socket.updateEntityState(data.id, data.state);
			}
		}
	});
	socket.on('updateEntityTarget', function(data){
		if(!user)
			return;

		if(!entities[data.id]){
			console.warn("Tried to modify an not existing entity '" + data.id + "'");
			return;
		}
		
		var target = data.target;
		if (data.target === 0) {
			target = user.name;
		}

		entities[data.id].target = target;
		for(var playerName in users){
			if(!users[playerName] || users[playerName] === user)
				continue;
			
			if(isOnMap(playerName, user.currentMap))
				users[playerName].socket.updateEntityTarget(data.id, target);
		}
		
		console.log('entity "' + data.id + '" now targets "' + target + '"');
	});
	socket.on('updateEntityHealth', function(data){
		if(!user)
			return;

		if(!entities[data.id]){
			console.warn("Tried to change health of an not existing entity '" + data.id + "'");
			return;
		}
		
		entities[data.id].hp = data.hp;
		console.info("Set health of " + data.id + " to " + data.hp);

		for(var playerName in users){
			if(!users[playerName] || users[playerName] === user)
				continue;
			
			if(isOnMap(playerName, user.currentMap))
				users[playerName].socket.updateEntityHealth(data.id, data.hp);
		}
	});
	socket.on('killEntity', function(data){
		if(!user)
			return;

		if(!entities[data.id]){
			//console.warn("Tried to kill an not existing entity '" + data.id + "'");
			return;
		}
		
		delete entities[data.id];
		for(var playerName in users){
			if(!users[playerName] || users[playerName] === user)
				continue;
			
			if(isOnMap(playerName, user.currentMap))
				users[playerName].socket.killEntity(data.id);
		}
		
		console.log('killed entity "' + data.id + '". There are now ' + Object.keys(entities).length + ' entities registered');
	});

	this.updatePosition = function(playerName){
		if(playerName != user.name){
			socket.emit('updatePosition', {player: playerName, pos:users[playerName].pos});
		}
	}
	this.updateAnimation = function(playerName, data){
		if(playerName != user.name){
			socket.emit('updateAnimation', {player: playerName, face: data.face, anim: data.anim});
		}
	}
	this.updateAnimationTimer = function(playerName, timer){
		if(playerName != user.name){
			socket.emit('updateAnimationTimer', {player: playerName, timer: timer});
		}
	}
	
	this.registerEntity = function(id, type, pos, settings){
		socket.emit('registerEntity', {id: id, type: type, pos: {x: pos.x, y: pos.y, z: pos.z}, settings: settings});
	}
	this.updateEntityPosition = function(id, pos){
		socket.emit('updateEntityPosition', {id: id, pos: {x: pos.x, y: pos.y, z: pos.z}});
	}
	this.updateEntityAnimation = function(id, face, anim){
		socket.emit('updateEntityAnimation', {id: id, face: face, anim: anim });
	}
	this.updateEntityState = function(id, state){
		socket.emit('updateEntityState', {id: id, state: state });
	}
	this.updateEntityTarget = function(id, target){
		socket.emit('updateEntityTarget', {id: id, target: target });
	}
	this.updateEntityHealth = function(id, hp){
		socket.emit('updateEntityHealth', {id: id, hp: hp });
	}
	this.killEntity = function(id){
		socket.emit('killEntity', {id: id});
	}
	
	this.onPlayerChangeMap = function(playerName, enters, pos, name, marker){
		if(playerName != user.name){
			socket.emit('onPlayerChangeMap', {player: playerName, enters:enters, position: pos, map: name, marker: marker});
		}
	}
}
User.users = users;
User.sockets = sockets;
User.host = undefined;
module.exports = User;
utilities.initialize(User);
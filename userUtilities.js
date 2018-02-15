module.exports = {
	initialize: function(user){
		this.users = user.users;
	},
	
	checkIfUserExists: function(name){
		if(!name)
			return false;
		for(var i in this.users)
			if(this.users[i] && this.users[i].name === name)
				return true;
		return false;
	}
}
/**
 *  Media Centre v0.0.1
 *  
 *  by Adrian Thomas-Prestemon
 *  Created 2013-11-16
 *  Updated 2013-11-16
 *  
 *  Inspired by http://blog.donaldderek.com/2013/06/build-your-own-google-tv-using-raspberrypi-nodejs-and-socket-io/
 */

// General Configuration
var MENU_UP = { type: "menu", name: "up" },
	MENU_DOWN = { type: "menu", name: "down" },
	MENU_LEFT = { type: "menu", name: "left" },
	MENU_RIGHT = { type: "menu", name: "right" },
	MENU_SELECT = { type: "menu", name: "select" },
	MENU_BACK = { type: "menu", name: "back" },

	MEDIA_PREV = { type: "media", name: "prev" },
	MEDIA_REWIND = { type: "media", name: "rew" },
	MEDIA_TOGGLE = { type: "media", name: "toggle" },
	MEDIA_FORWARD = { type: "media", name: "fwd" },
	MEDIA_NEXT = { type: "media", name: "next" },
	
	LINK_HOME = { type: "link", name: "home" };

// Dependencies
var express = require("express"),
	http = require("http"),
//	proxy = require("http-proxy"),
	app = express(),
	server = http.createServer(app),
	fs = require("fs"),
	path = require("path"),
	io = require("socket.io", {
		rememberTransport: false
	}).listen(server),
	child = require("child_process"),
	omx = require("omxcontrol");

// Express Config
app.set('port', process.env.TEST_PORT || 8080);
app.use(express.favicon());
app.use(express.logger("dev"));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, "public")));
app.use(omx());

// Routes
app.get('/', function (req, res) {
	res.sendfile(__dirname + "/public/index.html");
});

app.get('/screen', function (req, res) {
	res.sendfile(__dirname + "/public/screen.html");
});

app.get('/remote', function (req, res) {
	res.sendfile(__dirname + "/public/remote.html");
});

// Socket.IO Config
io.set("log level", 1);

// Handle Shell Script I/O
var run_shell = function(cmd, args, cb, end) {
	var sh = child.spawn(cmd, args),
		me = this;
	
	sh.stdout.on("data", function(buffer) { cb(me, buffer); });
	
	sh.stdout.on("end", end);
};

var listDirectory = function(data, callback) {
//		data = {
//			"path": "c:/fun/general-experiments/Raspberry-Pi-Media-Centre/public"
//		}
	// http://nodeexamples.com/2012/09/28/getting-a-directory-listing-using-the-fs-module-in-node-js/
	data.path = data.path || "/";
	fs.readdir(data.path, function (err, items) {
		if (err) {
			throw err;
		}

		console.log("listing files in path: " + data.path);

		data.list = [];

		console.log("items length", items.length);
		items.map(function (item) {
			return path.join(data.path, item);
		}).filter(function (item) {
			// Filter results based on type
			switch (data.filters.type) {
				case "file":
					try {
						return fs.statSync(item).isFile();
					} catch (e) {
						return false;
					}
					break;
				case "folder":
				case "directory":
				case "dir":
					try {
						return fs.statSync(item).isDirectory();
					} catch (e) {
						return false;
					}
					break;
				default:
					return true;
					break;
			}
		}).filter(function(item) {
			// Filter results based on type of media
			var ext = item.split(".").pop();
			switch (data.filters.media) {
				case "video":
					// if ext matches any extension in the list provided by config.json["media"]["video"]
					return true;
					break;
				case "audio":
					// if ext matches any extension in the list provided by config.json["media"]["audio"]
					return true;
					break;
				case "photo":
					// if ext matches any extension in the list provided by config.json["media"]["photo"]
					return true;
					break;
				default:
					return true;
					break;
			}
		}).filter(function(item) {
			// Filter results by file extension
			var ext = item.split(".").pop();
			if (data.filters.extension !== undefined && data.filters.extension !== null && data.filters.extension.length > 0) {
				data.filters.extension.forEach(function(filter) {
					if (ext === filter) {
						return true;
					}
				});
			} else {
				return true;
			}
		}).forEach(function (item) {
			var ext = item.split(".").pop(),//item.substring(item.lastIndexOf(".") + 1),
				name = item.substring(0, item.lastIndexOf(".")).substring((function(item) {
					if (item.lastIndexOf("/") > -1) {
						return item.lastIndexOf("/") + 1;
					} else if (item.lastIndexOf("\\") > -1) {
						return item.lastIndexOf("\\") + 1;
					}
				}(item)), item.length),
				type = (function(item) {
					try {
						return fs.statSync(item).isFile() ? "file" : "directory";
					} catch (e) {
						return "protected";
					}
				}(item));
			
			data.list.push({
				"fqn": item,
				"name": name,
				"type": type,
				"extension": ext
			});
		});

		// generate html partial
		// return raw data and html partial

		// or

		// return raw data
		// let client template engine generate html partial

//			var retData = {
//				"path": data.path,
//				"files": files
////				[
////					{ "name": "", "type": "directory" },
////					{ "name": "", "extension": "mp4", "type": "file" }
////				]
//			};

//		socket.emit("directory listing", data);
		if (typeof(callback) === "function") {
			callback(data);
		}
	});
};

/*
// Configure the proxy
var proxyServer = proxy.createServer({
	"router": {
		"media.dev": ("127.0.0.1:" + app.get("port"))
	}
});
proxyServer.listen(81);*/

// Launch the listener
server.listen(app.get("port"), function(){
	console.log("Express server listening on port " + app.get("port"));
});

var screen, remotes = [];

var ss;

io.sockets.on("connection", function(socket) {
	console.log("client connected");
	
	// Receive identification sent by client
	// Store reference to client instance
	socket.on("identify", function(data) {
		if (data.type !== undefined) {
			// Store the client type in the socket instance
			socket.type = data.type;
			socket.success = false;
			
			// Store the socket instance for later use
			switch (data.type) {
				case "screen":
					if (screen === undefined) {
						screen = socket;
						socket.success = true;
					} else {
						io.sockets.socket(socket.id).emit("screen already connected", data);
						console.log("client id '" + socket.id + "' attempted to identify as type '" + data.type + "' but the maximum number of clients of that type has been reached");
					}
					break;
				case "remote":
					remotes.push(socket);
					socket.success = true;
					break;
				default:
					console.log("unknown client connected");
					break;
			}
			
			if (socket.success === true) {
				console.log("client id '" + socket.id + "' identified as type '" + data.type + "'");
			
				// Notify the client it has successfully identified itself, and provide it with its new ID token for reference.
				data.id = socket.id;
				io.sockets.socket(socket.id).emit("identified", data);

				var input = {
					"path": "c:/fun/general-experiments/Raspberry-Pi-Media-Centre",
					"filters": {
						"type": null,//"dir"
						"extension": [],//["mp3", "mkv", "jpg"]
						"media": null//"media"
					}
				};
				listDirectory(input, function(data) {
					socket.emit("directory listing", data);
				});
			}
		}
	});
	
	// Handle disconnection of clients and subsequent removal of client resources
	socket.on("disconnect", function(data) {
		// remove socket from clients array/object/whatever
		switch (socket.type) {
			case "screen":
				if (screen !== undefined && screen.id === socket.id) {
					screen = undefined;
					console.log("screen disconnected");
				}
				break;
			case "remote":
				var oldRemote;
				for (var i = 0; i < remotes.length; i ++) {
					if (remotes[i].id === socket.id) {
						oldRemote = remotes.splice(i, 1);
					}
				}
				if (oldRemote !== undefined) {
					console.log("remote id '" + oldRemote.id + "' disconnected");
				} else {
					console.log("unknown remote disconnected");
				}
				break;
			default:
				console.log("unknown client disconnected");
				break;
		}
	});
	
	// General message handler for testing
	socket.on("debug", function(data) {
		console.log("debug", data);
	});
	
	// categories
		// video
			// movies
			// shows
				// episodes
		// audio
			// playlists
			// artisis
			// genres
			// songs
	
	// category listing
	// show listing
	// episode listing
	
	socket.on("list directory", function(data) {
		listDirectory(data, function(data) {
			socket.emit("directory listing", data);
		});
	});
	
	socket.on("load media", function(data) {
		var media = listFiles("C:\\fun\\general-experiments\\Raspberry-Pi-Media-Centre\\public");
		console.log("media");
		/*io.sockets.socket(socket.id).emit("media listing", {
			
		});*/
	});
	
//	socket.on("play", function(data) {
//		child.spawn("omxplayer", ["-l 142", <filepath>]);
//	});
	
	// http://stackoverflow.com/questions/10901660/node-js-interact-with-shell-application
	// var child = require('child_process');
	// var ps = child.spawn('python', ['-i']);
	// ps.stdout.pipe(process.stdout);
	// ps.stdin.write('1+1');
	// ps.stdin.end();
	
//	ANSI cursor key escape sequences:
//	up - "\027[A"
//	down - "\027[B"
//	left - "\027[D"
//	right - "\027[C"

//	UTF-8 cursor key escape sequences:
//	up - "\u001b[A"
//	down - "\u001b[B"
//	left - "\u001b[C"
//	right - "\u001b[D"
	
	var OMX = {
		"PREV_AUDIO":		"j",
		"NEXT_AUDIO":		"k",
		"PREV_CHAPTER":		"i",
		"NEXT_CHAPTER":		"o",
		"PREV_SUBS":		"n",
		"NEXT_SUBS":		"m",
		"TOGGLE_SUBS":		"s",
		"SUBS_DELAY_MINUS":	"d",
		"SUBS_DELAY_PLUS":	"f",
		"QUIT":				"q",
		"PAUSE":			"p",
		"VOL_DOWN":			"-",
		"VOL_UP":			"+",
		"REW_30":			"\027[A",//0x5b44, // left arrow -- maybe save current time, quit player, reopen at earlier time?
		"FWD_30":			"\027[B", //0x5b43, // right arrow
		"REW_600":			"\027[C", //0x5b42, // up arrow
		"FWD_600":			"\027[D" //0x5b41 // down arrow
	};
	
	// start episode
	// var ps = child.spawn("omxplayer", ["-l 142", <filepath>]
	// pause/play
	// ps.stdin.write("p");
	
	
	// Receive control signals sent by "remote" clients
	// Interpret and route control signals to "screen" clients
	socket.on("control", function(data) {
		console.log("received control signal", data);
		
		// If a "screen" client is connected
		// and if the control signal was received from a "remote" client
		// interpret and route the control signal appropriately
		if (screen !== undefined && socket.type === "remote") {
			// send control signals to screen instance(s)
			switch (data.action) {
				// list directory
				case "ls":
					break;
				// open media file
				case "load file":
					break;
				// transport controls
				case "transport":
					break;
				// old stuff
				case "stuff":
					screen.emit("controlling", data);
					break;
				case "play":
					// play media file
//					data = {
//						path: "/path/to/media/file.ext"
//					};
					break;
			}
		} else {
			socket.emit("no screen");
		}
		
		// OLD STUFF:
		if (socket.type === "remote") {
			
			/*
			 * { action: "", shortcut: "" }
			 * 
			 */
			
			switch (data.action) {
				case "tap":
					if (ss !== undefined) {
						ss.emit("controlling", { action: "enter" });
					}
					break;
				case "swipeLeft":
					if (ss !== undefined) {
						ss.emit("controlling", { action: "goLeft" });
					}
					break;
				case "swipeRight":
					if (ss !== undefined) {
						ss.emit("controlling", { action: "goRight" });
					}
					break;
				case "click":
					console.log("received click event");
					if (ss !== undefined) {
						ss.emit("controlling", { action: "doClick" });
						console.log("received click event");
					} else {
						console.log("ss is undefined");
					}
					break;
			}
		}
	});
	
	socket.on("video", function(data) {
		if (data.action === "play") {
			var id = data.video_id,
				url = "http://www.youtube.com/watch?v=" + id;
			
			var runShell = new run_shell("youtube-dl", [
				"-o",
				"%(id)s.%(ext)s",
				"-f",
				"/18/22",
				url
			], function(me, buffer) {
				me.stdout += buffer.toString();
				
				socket.emit("loading", { output: me.stdout });
				
				console.log(me.stdout);
			}, function() {
				//child = spawn("omxplayer", [id + ".mp4"]);
				omx.start(id + ".mp4");
			});
		}
	});
});




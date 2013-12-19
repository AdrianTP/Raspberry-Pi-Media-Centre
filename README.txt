Raspberry-Pi-Media-Centre
=========================
Thanks to http://blog.donaldderek.com/2013/06/build-your-own-google-tv-using-raspberrypi-nodejs-and-socket-io/ for the idea and the starter code.

Planned contexts for media player:

Main
+	Just Finished
+	Now Playing
+	Coming Up Next
+	Calendar events and to-do list items?
+	Media
	+	Video
	+	Local
		+	USB
		+	SD
	+	Remote
		+	Add New Server
		+	Scan for Servers
		+	<List of Known Servers>
	+	Internet
		+	YouTube
		+   Enter YouTube Address?
		+   Browse YouTube
		+   Channels
	+	Audio
	+	Local
		+	USB
		+	SD
	+	Remote
		+	Add New Server
		+	Scan for Servers
		+	<List of Known Servers>
	+	Internet
		+	Pandora
		+	Spotify
		+	Last.fm
		+	iHeart Radio
		+	DI.fm
+	Weather (powered by Forecast.io) <Current Weather Conditions and High Temperature / Low Temperature / Chance of Precipitation>
	+	Weekly forecast <displayed as a list>
	+	Daily forecast <displayed when select a day from weekly forecast>
+	Internet
	+	Browser-in-browser <iframe?>
+	Settings <need to think this over and figure out how (and if!) to save settings>

Planned contexts for remote:

Main <shortcut icons mirroring television display, cursor keys and select/back buttons>
+	Just Finished
+	Now Playing
	+	Playback Controls
+	Coming Up Next
+	Simplified Weather
+	Calendar / To-Do List Button ?
+	Media
+	Weather
+	Internet

Data to send from remote:
if link type is button
	send { type: "button", name: "button name" } <cursor, select, back, playback controls>
if link type is shortcut
	send { type: "shortcut", name: "shortcut name" } <media, now playing, etc.>

First version menu structure:

Main: ()
+	Channels
	+	Library
		+	Video
		+	Audio
+	Current Show navigation (Now Playing, swipe/tap to previous/next episodes)
	+	Now Playing
		+	Playback Controls

Connection Steps:

Client:
1.	try to connect
2.	on successful connection, identify client type
3.	on acknowledgement of receipt of client type, enter ready state

Server:
1.	await client connections
2.	on successful connection, await identification of client type
3.	on receipt of client type, acknowledge with message to client, enter ready state

screen is first to connect
server will ignore control signals if screen is not connected
each client tries to connect as screen first -- if screen is already connected, changes connection type to remote or is forwarded to remote page by server

TO DO:
+	finish file directory navigation
	1.	node lists directory and sends to client
		server.emit("listing directory", { "path": "root", "list": [
			{ "name": "", "type": "directory" },
			{ "name": "", "extension": "mp4", "type": "file" }
		] });
	2.	client receives listing and generates html
		remote.on("directory listing", template.generateList);
		screen.on("directory listing", template.generateDirectoryDetails);
	3.	user clicks on listing item...
	4.	client sends path for clicked list item to node
		$(document).on("click.tile", ".tile", function(e) {
			remote.emit("clicked item", { "item": e.target.data() });
		});
// click of show folder loads show information page:
	// screen shows cover image and show details
	// remote shows episode listing and controls:
		// reset to beginning and start playing
		// jump to last watched episode info tile
		// set show-wide settings like start and end offsets
// episode listing button displays list of episodes in show (simple list, fancy list, grid, or "coverflow")
// click of episode list item loads episode information page with play/back buttons
// if previously watched, can resume from last known time index
// last watch date/time, watch count, favourite/featured status
// click of play button on episode information page initiates playback of file
	5.	repeat 1-4 if clicked type is directory
	6.	if clicked type is file, node receives path and plays file with omxplayer
	7.	node tells remote to display "now playing" screen with transport controls
		server.on("clicked item", function(data) {
			switch(data.item.type) {
				case "folder":
					// emit "listing directory"
					break;
				case "file":
					server.emit("now playing", { "type": "show", "name": "", "episode": "", "start": 142 });
					// play file from stored time index
					break;
				default:
					break;
			}
		});
	8.	user input event loop for omxplayer transport control (user can click transport buttons to control omxplayer or can navigate media directories and play other files)
		$(document).on("click.transport", ".transport", function(e) {
			var action = e.target.data("transport-action");
			remote.emit("transport", { "action": action });
		});
+	finish omxplayer controller (transport buttons and associated socket.io messages and corresponding node actions)
+	timed autoload of next file in folder?
+	check out front-end library for templating and/or application structure
	1.	angular.js
	2.	handlebars.js + quo.js/jquery.js
+	set up raspi VM
	1.	make image of boot disk with win32imager
	2.	download Qemu
	3.	follow these instructions: http://xecdesign.com/qemu-emulating-raspberry-pi-the-easy-way/
	4.	or these: http://techny.tumblr.com/post/36589722093/quick-guide-on-emulating-a-raspberry-pi-in-windows
	5.	or the post by d4n13 here: http://www.raspberrypi.org/phpBB3/viewtopic.php?f=29&t=37386&start=25

Library
	Movies
		Some_Movie
			movie.mkv
			cover.png (cover art)
			info.json (link to cover art and description text)
			movie.png (auto-generated screenshot)
	Shows
		Some_Show
			cover.png (cover art for whole show)
			info.json (link to cover art and description text for whole show)
			Season_1
				cover.png (cover art for whole season)
				info.json (link to cover art and description text for whole season)
				episode1.mp4
				episode1.png (screenshot for episode)
				episode1.json (link to screenshot and description text for episode)
	Music
		?
	Photos
		?
/*
TCPchat - a node.js tcp chat for multiple users and support to use nicknames
Copyright (C) 2015  Jens Wirth <jewirth@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
  TODO: Write history to file:
    fs.writeFile('../data.json', JSON.stringify(myobj, null, 2) , 'utf-8');

  TODO: Read history from file:
    data = JSON.parse(fs.readFileSync('../data.json'));
*/

String.prototype.cleanup = function() {
  return this.replace(/[^a-zA-Z0-9]+/g, '');
}

var net = require('net');
var fs = require('fs');

var tcpPort = 3000;
var history = [];
var nextID = 0;
var users = {
  count: 0,
  ids: [],
  nicks: [],
  sockets: [],
}

function nickUsed(nick) {
  for (x in users.nicks) {
    if (users.nicks[x] == nick) {
      return true;
    }
  }
  return false;
}

function userJoins(socket, userid) {
  users.count++;
  users.sockets.push(socket);
  users.nicks.push('User ' + userid);
  users.ids.push(userid)
  socket.write('Welcome to TCP chat. ' + (users.sockets.length) + ' user(s) online incl. you.\n');
  for (i=0; i<history.length; i++) {
    socket.write(history[i]);
  }
  socket.write('Choose a nickname: ');
  for (var i=0; i<users.sockets.length; i++) {
    if (users.sockets[i] == socket) {
      continue;
    }
    users.sockets[i].write('INFO: ' + users.nicks.slice(-1) + ' joined\n');
  }
}

function userLeaves(socket) {
  socket.on('end', function() {
    var i = users.sockets.indexOf(socket);
    var name = users.nicks[i];
    users.count--;
    users.ids.splice(i, 1);
    users.nicks.splice(i, 1);
    users.sockets.splice(i, 1);
    for (var j=0; j<users.sockets.length; j++) {
      users.sockets[j].write(name + ' left the chat\n');
    }
  });
}

function chooseNickname(socket, name, userid) {
  // find username with id <userid>
  for (var i=0; i<users.ids.length; i++) {
    if (users.ids[i] == userid) {
      if (users.nicks[i] == 'User ' + userid) {
        if (!nickUsed(name.toString().cleanup())) {
          users.nicks[i] = name.toString().cleanup();
          for (var j=0; j<users.sockets.length; j++) {
            if (users.sockets[j] == socket) {
              continue;
            }
            users.sockets[j].write('INFO: User ' + userid + ' choosed nickame ' + name.toString().cleanup()+'\n');
          }
          return 1;
        }
        socket.write('This nickname is in use. Choose another nickname: ');
        return 1;
      }
    }
  }
}

function addToHistory(msg) {
  history.push(msg);
  if (history.length > 10) {
    history = history.slice(1);
  }
}

function processMessage(socket, msg) {
  // search socket where data comes from to add the correct nickname
  for (var i=0; i < users.sockets.length; i++) {
    if (socket == users.sockets[i]) {
      msg = users.nicks[i] + ': ' + msg;
      addToHistory(msg);
    }
  }
  // send message to everyone but the sender
  for (var i=0; i<users.sockets.length; i++) {
    if (users.sockets[i] == socket) {
      continue;
    }
    users.sockets[i].write(msg);
  }
}

var chatserver = net.createServer(function(socket) {
  var userid = nextID++;
  userJoins(socket, userid);
  socket.on('data', function(msg) {
    if (chooseNickname(socket, msg, userid) == 1) { return };
    processMessage(socket, msg);
  });
  userLeaves(socket);
}).listen(3000);

//eof

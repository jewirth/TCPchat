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

var net = require('net');
var fs = require('fs');

String.prototype.cleanup = function() {
  return this.replace(/[^a-zA-Z0-9]+/g, '');
}

var tcpPort = 3000;

var history = [];

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

function userJoins(socket, currentUserID) {
  users.sockets.push(socket);
  users.nicks.push('User ' + currentUserID);
  console.log(users.nicks.slice(-1) + ' joined');
  socket.write('Welcome to TCP chat. ' + (users.sockets.length) + ' user(s) online incl. you.\n');
  for (i=0; i<history.length; i++) {
    socket.write(history[i]);
  }
  socket.write('Choose a nickname: ');
  for (var i=0; i<users.sockets.length; i++) {
    if (users.sockets[i] == socket) {
      continue;
    }
    users.sockets[i].write('INFO: someone joined the chat\n');
  }
}

function userLeaves(socket) {
  socket.on('end', function() {
    var i = users.sockets.indexOf(socket);
    console.log(users.nicks[i] + ' leaves');
    for (var j=0; j<users.sockets.length; j++) {
      users.sockets[j].write(users.nicks[i] + ' left the chat\n');
    }
    users.count--;
    users.ids.splice(i, 1);
    users.nicks.splice(i, 1);
    users.sockets.splice(i, 1);
  });
}

function chooseNickname(socket, name, currentUserID) {
  if (users.nicks[currentUserID-1] == 'User ' + currentUserID) {
    if (!nickUsed(name.toString().cleanup())) {
      users.nicks[currentUserID-1] = name.toString().cleanup();
      console.log('User ' + currentUserID + ' choosed nickame ' + name.toString().cleanup());
      return 1;
    }
    socket.write('This nickname is in use. Choose another nickname: ');
    return 1;
  }
}

function addToHistory(msg) {
  history.push(msg);

  // cut last line if history exceeds 10 lines
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
  var currentUserID = ++users.count;
  userJoins(socket, currentUserID);
  socket.on('data', function(msg) {
    if (chooseNickname(socket, msg, currentUserID) == 1) { return };
    processMessage(socket, msg);
  });
  userLeaves(socket);
}).listen(3000);

//eof

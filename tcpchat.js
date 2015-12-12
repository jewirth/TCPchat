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

String.prototype.cleanup = function() {
  return this.replace(/[^a-zA-Z0-9]+/g, '');
}

var tcpPort = 3000;

var net = require('net');

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
    users.sockets.splice(i, 1);
    for (var i=0; i<users.sockets.length; i++) {
      users.sockets[i].write('INFO: someone left the chat\n');
    }
  });
}

function chooseNickname(socket, data, currentUserID) {
  if (users.nicks[currentUserID-1] == 'User ' + currentUserID) {
    if (!nickUsed(data.toString().cleanup())) {
      users.nicks[currentUserID-1] = data.toString().cleanup();
      console.log('User ' + currentUserID + ' choosed nickame ' +   data.toString().cleanup());
      return 1;
    }
    socket.write('This nickname is in use. Choose another nickname: ');
    return 1;
  }
}

function processMessage(socket, data) {
  // search socket where data comes from to add the correct nickname
  for (var i=0; i < users.sockets.length; i++) {
    if (socket == users.sockets[i]) {
      data = users.nicks[i] + ': ' + data;
    }
  }
  // send message to everyone but the sender
  for (var i=0; i<users.sockets.length; i++) {
    if (users.sockets[i] == socket) {
      continue;
    }
    users.sockets[i].write(data);
  }
}

var chatserver = net.createServer(function(socket) {
  var currentUserID = ++users.count;
  userJoins(socket, currentUserID);
  socket.on('data', function(data) {
    if (chooseNickname(socket, data, currentUserID) == 1) { return };
    processMessage(socket, data);
  });
  userLeaves(socket);
}).listen(3000);

//eof

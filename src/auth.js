// Auth layer stub. Replace authenticate() with real verification (JWT, OAuth, sessions...).
// Return a user object {id, name} or null to reject the connection.
module.exports.authenticate = async function(token, req, requestedName){
  return { id: 'guest-' + Math.random().toString(36).slice(2,8), name: (requestedName||'Player').slice(0,16), guest: true };
};

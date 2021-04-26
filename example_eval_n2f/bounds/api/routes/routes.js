'use strict';
module.exports = function(app) {
  var api = require('../controllers/bounds');

  app.route('/cpu/:a/:b')
    .get(api.cpu)

  app.route('/memory/:a/:b')
    .get(api.memory)

  app.route('/io/:a/:b')
    .get(api.io)

}

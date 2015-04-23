
const NET = require("net");
const PORTFINDER = require("portfinder");


exports.for = function (API) {

	var exports = {};

	exports.resolve = function (resolver, config, previousResolvedConfig) {

		var previousPorts = (previousResolvedConfig && previousResolvedConfig.allocatedPorts) || null;
		var ports = [];

		return resolver({
			getFreePort: function (partiallyResolvedConfig, range) {
				if (previousPorts) {
					if (previousPorts.length > 0) {
						var port = previousPorts.shift();
						ports.push(port);
						return port;
					}
				}
				if (range) {
					// e.g. "{{getFreePort(49000-49100)}}"
					function getPortInRange (fromPort, toPort) {
						if (fromPort === 49000) {
							// We are looking for a docker port which is not so easy when using boot2docker.
							// The ports are mapped to the proxy so they will come back as used.
							// TODO: Keep port assignments in global registry
							// TODO: Verify that port is mapped to boot to docker
							// TODO: Verify that port is actually free
							throw new Error ("NYI");
						}
						return PORTFINDER.getPort({
							port: fromPort
						}, function (err, port) {
							if (err) return callback(err);
							if (port > toPort) {
								API.console.debug("Port '" + port + "' is higher than '" + toPort + "'. Try again ...");
								return getPortInRange(fromPort, toPort);
							}
							ports.push(port);
							return callback(null, port);
						});
					}
					range = range.split("-");
					return getPortInRange(parseInt(range[0]), parseInt(range[1]));
				} else {
					// Get a free port using NodeJS which uses ports assigned by OS.
					// TODO: Dish out ports based on other criteria.
					var deferred = API.Q.defer();
					var server = NET.createServer();
					var port = 0;
					server.on('listening', function() {
						port = server.address().port;
						return server.close();
					});
					server.on('close', function() {
						ports.push(port);
						return deferred.resolve(port);
					});
					server.listen(0, '127.0.0.1');
					return deferred.promise;
				}
			}
		}).then(function (resolvedConfig) {

			resolvedConfig.allocatedPorts = ports;

			return resolvedConfig;
		});
	}

	exports.turn = function (resolvedConfig) {
	}

	exports.spin = function (resolvedConfig) {
	}

	return exports;
}
